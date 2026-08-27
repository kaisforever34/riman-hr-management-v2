'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { manualCheckInSchema, managerOverrideSchema } from '@/lib/validations/attendance'
import { submitOvertimeSchema, approveOvertimeSchema } from '@/lib/validations/leave'
import { auth } from '@/lib/auth'
import { getTodayUaeDate, isWithinSchedule, getEarlyLeaveMinutes, getGracePeriodMinutes, getOvertimeMinutes, getAutoClockoutTime, getWorkSchedule } from '@/lib/schedule'
import { revalidatePath } from 'next/cache'
import type { AttendanceStatus, OvertimeStatus } from '@/lib/types'
import { logAudit } from '@/lib/audit'
import { isUniqueConstraintError } from '@/lib/db-errors'
import { isApprover } from '@/lib/roles'

export async function checkIn(employeeId?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  let employee
  if (employeeId) {
    if (!isApprover(session.user.role)) return { error: await serverError('unauthorized') }
    employee = await db.employee.findUnique({ where: { id: employeeId } })
  } else {
    employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  }
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const today = getTodayUaeDate()
  const now = new Date()
  const gracePeriod = await getGracePeriodMinutes()
  const workSchedule = await getWorkSchedule()
  const { isLate, lateMinutes } = isWithinSchedule(now, gracePeriod, workSchedule)

  const data = {
    checkIn: now,
    status: (isLate ? 'LATE' : 'PRESENT') as AttendanceStatus,
    lateMinutes,
    graceMinutes: gracePeriod,
    checkInMethod: 'CLICK',
  }

  try {
    await db.attendanceRecord.create({
      data: { employeeId: employee.id, date: today, ...data },
    })
  } catch (e) {
    const isUniqueViolation = isUniqueConstraintError(e)
    if (!isUniqueViolation) throw e
    const updated = await db.attendanceRecord.updateMany({
      where: { employeeId: employee.id, date: today, checkIn: null },
      data,
    })
    if (updated.count === 0) return { error: await serverError('alreadyCheckedIn') }
  }

  revalidatePath('/attendance')
}

export async function manualCheckIn(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  const onBehalfId = formData.get('employeeId') as string | null
  let employee
  if (onBehalfId) {
    if (!isApprover(session.user.role)) return { error: await serverError('unauthorized') }
    employee = await db.employee.findUnique({ where: { id: onBehalfId } })
  } else {
    employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  }
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const parsed = manualCheckInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidInput'), fieldErrors: parsed.error.flatten().fieldErrors }

  const now = new Date()
  const checkInTime = new Date(parsed.data.checkIn)
  if (checkInTime > now) return { error: await serverError('checkInFuture') }

  const today = getTodayUaeDate()
  const gracePeriod = await getGracePeriodMinutes()
  const workSchedule = await getWorkSchedule()
  const { isLate, lateMinutes } = isWithinSchedule(checkInTime, gracePeriod, workSchedule)

  const data = {
    checkIn: checkInTime,
    status: (isLate ? 'LATE' : 'PRESENT') as AttendanceStatus,
    lateMinutes,
    graceMinutes: gracePeriod,
    checkInMethod: 'MANUAL',
    checkInNote: parsed.data.note,
  }

  try {
    await db.attendanceRecord.create({
      data: { employeeId: employee.id, date: today, ...data },
    })
  } catch (e) {
    const isUniqueViolation = isUniqueConstraintError(e)
    if (!isUniqueViolation) throw e
    const updated = await db.attendanceRecord.updateMany({
      where: { employeeId: employee.id, date: today, checkIn: null },
      data,
    })
    if (updated.count === 0) return { error: await serverError('alreadyCheckedIn') }
  }

  revalidatePath('/attendance')
}

export async function checkOut(employeeId?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  let employee
  if (employeeId) {
    if (!isApprover(session.user.role)) return { error: await serverError('unauthorized') }
    employee = await db.employee.findUnique({ where: { id: employeeId } })
  } else {
    employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  }
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const today = getTodayUaeDate()
  const record = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  })
  if (!record?.checkIn) return { error: await serverError('notCheckedIn') }
  if (record?.checkOut) return { error: await serverError('alreadyCheckedOut') }

  const now = new Date()
  const workSchedule = await getWorkSchedule()
  const earlyLeaveMinutes = getEarlyLeaveMinutes(now, workSchedule)
  const overtimeMinutes = getOvertimeMinutes(now, workSchedule)

  const updated = await db.attendanceRecord.updateMany({
    where: { id: record.id, checkOut: null },
    data: {
      checkOut: now,
      checkOutMethod: 'CLICK',
      earlyLeaveMinutes,
      overtimeMinutes,
      overtimeApproved: overtimeMinutes > 0,
    },
  })
  if (updated.count === 0) return { error: await serverError('alreadyCheckedOut') }

  revalidatePath('/attendance')
}

export async function submitOvertime(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  if (!isApprover(session.user.role)) {
    return { error: await serverError('unauthorized') }
  }

  const parsed = submitOvertimeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidInput'), fieldErrors: parsed.error.flatten().fieldErrors }

  const { employeeId, date, minutes, reason } = parsed.data

  const employee = await db.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const overtimeDate = new Date(date)

  try {
    const record = await db.overtimeRecord.create({
      data: {
        employeeId: employee.id,
        date: overtimeDate,
        minutes,
        reason,
        status: 'PENDING',
      },
    })

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: 'OVERTIME_SUBMITTED',
      entityType: 'OvertimeRecord',
      entityId: record.id,
      detail: { employeeId: employee.id, date, minutes, reason },
    })

    revalidatePath('/attendance')
    revalidatePath('/overtime')
    return { success: true }
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      // Allow resubmission if the existing record was rejected
      const existing = await db.overtimeRecord.findFirst({
        where: { employeeId, date: overtimeDate },
      })
      if (existing && existing.status === 'REJECTED') {
        await db.overtimeRecord.update({
          where: { id: existing.id },
          data: { minutes, reason, status: 'PENDING', approvedById: null, approvedAt: null },
        })
        revalidatePath('/attendance')
        revalidatePath('/overtime')
        return { success: true }
      }
      return { error: await serverError('overtimeAlreadySubmitted') }
    }
    throw e
  }
}

export async function approveOvertime(formData: FormData) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const parsed = approveOvertimeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidInput'), fieldErrors: parsed.error.flatten().fieldErrors }

  const { id: overtimeId, status, rejectionReason } = parsed.data

  const overtimeRecord = await db.overtimeRecord.findUnique({ where: { id: overtimeId } })
  if (!overtimeRecord) return { error: await serverError('overtimeNotFound') }
  if (overtimeRecord.status !== 'PENDING') return { error: await serverError('overtimeAlreadyProcessed') }

  await db.overtimeRecord.update({
    where: { id: overtimeId },
    data: {
      status: status as OvertimeStatus,
      approvedById: session.user.id,
      approvedAt: new Date(),
      reason: rejectionReason || overtimeRecord.reason,
    },
  })

  if (status === 'APPROVED') {
    await db.attendanceRecord.updateMany({
      where: {
        employeeId: overtimeRecord.employeeId,
        date: overtimeRecord.date,
      },
      data: {
        overtimeMinutes: overtimeRecord.minutes,
        overtimeApproved: true,
      },
    })
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'OVERTIME_APPROVED',
    entityType: 'OvertimeRecord',
    entityId: overtimeId,
    detail: { overtimeId, status, employeeId: overtimeRecord.employeeId },
  })

  revalidatePath('/attendance')
  revalidatePath('/overtime')
}

export async function autoClockout() {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const today = getTodayUaeDate()
  const workSchedule = await getWorkSchedule()
  const { hour: autoHour, minute: autoMinute } = await getAutoClockoutTime()
  const shiftEnd = new Date(Date.UTC(
    today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
    autoHour, autoMinute, 0, 0,
  ))

  const records = await db.attendanceRecord.findMany({
    where: {
      date: today,
      checkIn: { not: null },
      checkOut: null,
    },
    include: { employee: true },
  })

  let count = 0
  for (const record of records) {
    const overtimeMinutes = getOvertimeMinutes(shiftEnd, workSchedule)
    await db.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOut: shiftEnd,
        checkOutMethod: 'AUTO',
        autoClockout: true,
        overtimeMinutes,
        overtimeApproved: overtimeMinutes > 0,
      },
    })
    count++
  }

  revalidatePath('/attendance')
  revalidatePath('/manager/attendance')
  return { success: true, count }
}

export async function managerOverrideAttendance(formData: FormData) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const parsed = managerOverrideSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidInput'), fieldErrors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const date = new Date(data.date)
  const employee = await db.employee.findUnique({ where: { id: data.employeeId } })
  if (!employee) return { error: await serverError('employeeNotFound') }

  const updateData: Record<string, unknown> = {
    adjustedById: session.user.id,
  }

  if (data.checkIn) updateData.checkIn = new Date(data.checkIn)
  if (data.checkOut) updateData.checkOut = new Date(data.checkOut)
  if (data.status) updateData.status = data.status
  if (data.note) updateData.checkInNote = data.note
  if (data.overtimeMinutes !== undefined) updateData.overtimeMinutes = data.overtimeMinutes

  if (data.checkIn) {
    const gracePeriod = await getGracePeriodMinutes()
    const workSchedule = await getWorkSchedule()
    const { isLate, lateMinutes } = isWithinSchedule(new Date(data.checkIn), gracePeriod, workSchedule)
    updateData.status = data.status || ((isLate ? 'LATE' : 'PRESENT') as AttendanceStatus)
    updateData.lateMinutes = lateMinutes
    updateData.graceMinutes = gracePeriod
  }

  if (data.checkOut) {
    const workSchedule = await getWorkSchedule()
    const overtimeMinutes = getOvertimeMinutes(new Date(data.checkOut), workSchedule)
    // Preserve explicit overtimeMinutes (including 0) from the manager's override;
    // only fall back to calculated if the field was not provided.
    if (data.overtimeMinutes === undefined) {
      updateData.overtimeMinutes = overtimeMinutes
    }
  }

  if (data.checkIn) updateData.checkInMethod = 'MANAGER'
  if (data.checkOut) updateData.checkOutMethod = 'MANAGER'

  await db.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: data.employeeId, date } },
    update: updateData,
    create: {
      employeeId: data.employeeId,
      date,
      checkIn: data.checkIn ? new Date(data.checkIn) : null,
      checkOut: data.checkOut ? new Date(data.checkOut) : null,
      status: data.status || 'PRESENT',
      checkInMethod: 'MANAGER',
      checkOutMethod: data.checkOut ? 'MANAGER' : null,
      checkInNote: data.note,
      adjustedById: session.user.id,
      overtimeMinutes: data.overtimeMinutes ?? 0,
    },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'ATTENDANCE_OVERRIDE',
    entityType: 'AttendanceRecord',
    entityId: `${data.employeeId}:${data.date}`,
    detail: { employeeId: data.employeeId, date: data.date },
  })

  revalidatePath('/manager/attendance')
  revalidatePath('/manager/attendance/reports')
}

export async function markAbsent(employeeIds: string[], date?: string) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const targetDate = date ? new Date(date) : getTodayUaeDate()
  const workSchedule = await getWorkSchedule()
  const shiftStart = `${String(workSchedule.startHour).padStart(2, '0')}:${String(workSchedule.startMinute).padStart(2, '0')}`
  const shiftEnd = `${String(workSchedule.endHour).padStart(2, '0')}:${String(workSchedule.endMinute).padStart(2, '0')}`
  const note = `Auto-marked absent. Expected shift: ${shiftStart}-${shiftEnd}`

  const results = await Promise.all(
    employeeIds.map(async (employeeId) => {
      // Only mark absent if no check-in has been recorded for this employee on this date.
      // This prevents overwriting a valid PRESENT/LATE record with ABSENT.
      const existing = await db.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId, date: targetDate } },
        select: { id: true, checkIn: true },
      })
      if (existing?.checkIn) return existing // skip — already checked in

      return db.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date: targetDate } },
        update: { status: 'ABSENT', checkInNote: note, adjustedById: session.user.id },
        create: {
          employeeId,
          date: targetDate,
          status: 'ABSENT',
          checkInNote: note,
          adjustedById: session.user.id,
        },
      })
    })
  )

  revalidatePath('/attendance')
  revalidatePath('/manager/attendance')

  return { success: true, count: results.length }
}

export async function getOvertimeRecords(filters?: {
  employeeId?: string
  status?: OvertimeStatus
  month?: number
  year?: number
}) {
  const session = await auth()
  if (!session?.user) return { error: await serverError('unauthorized') }

  const where: Record<string, unknown> = {}
  if (filters?.employeeId) where.employeeId = filters.employeeId
  if (filters?.status) where.status = filters.status
  if (filters?.month !== undefined && filters?.year !== undefined) {
    const start = new Date(filters.year, filters.month - 1, 1)
    const end = new Date(filters.year, filters.month, 0, 23, 59, 59)
    where.date = { gte: start, lte: end }
  } else if (filters?.year !== undefined) {
    const start = new Date(filters.year, 0, 1)
    const end = new Date(filters.year, 11, 31, 23, 59, 59)
    where.date = { gte: start, lte: end }
  }

  const records = await db.overtimeRecord.findMany({
    where,
    include: {
      employee: {
        include: { user: { select: { email: true } } },
      },
      approvedBy: { select: { email: true } },
    },
    orderBy: { date: 'desc' },
  })

  return { data: records }
}

export async function getMyOvertime() {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const records = await db.overtimeRecord.findMany({
    where: { employeeId: employee.id },
    orderBy: { date: 'desc' },
  })

  return { data: records }
}
