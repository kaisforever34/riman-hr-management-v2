'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { manualCheckInSchema, managerOverrideSchema } from '@/lib/validations/attendance'
import { auth } from '@/lib/auth'
import { getTodayUaeDate, isWithinSchedule, getEarlyLeaveMinutes, WORK_START_HOUR, WORK_START_MINUTE, WORK_END_HOUR, WORK_END_MINUTE } from '@/lib/schedule'
import { revalidatePath } from 'next/cache'
import type { AttendanceStatus } from '@/lib/types'
import { logAudit } from '@/lib/audit'
import { isUniqueConstraintError } from '@/lib/db-errors'
import { isApprover } from '@/lib/roles'

export async function checkIn() {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const today = getTodayUaeDate()
  const now = new Date()
  const { isLate, lateMinutes } = isWithinSchedule(now)

  const data = {
    checkIn: now,
    status: (isLate ? 'LATE' : 'PRESENT') as AttendanceStatus,
    lateMinutes,
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

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const parsed = manualCheckInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidInput'), fieldErrors: parsed.error.flatten().fieldErrors }

  const now = new Date()
  const checkInTime = new Date(parsed.data.checkIn)
  if (checkInTime > now) return { error: await serverError('checkInFuture') }

  const today = getTodayUaeDate()
  const { isLate, lateMinutes } = isWithinSchedule(checkInTime)

  const data = {
    checkIn: checkInTime,
    status: (isLate ? 'LATE' : 'PRESENT') as AttendanceStatus,
    lateMinutes,
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

export async function checkOut() {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const today = getTodayUaeDate()
  const record = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  })
  if (!record?.checkIn) return { error: await serverError('notCheckedIn') }
  if (record?.checkOut) return { error: await serverError('alreadyCheckedOut') }

  const now = new Date()
  const earlyLeaveMinutes = getEarlyLeaveMinutes(now)

  const updated = await db.attendanceRecord.updateMany({
    where: { id: record.id, checkOut: null },
    data: {
      checkOut: now,
      checkOutMethod: 'CLICK',
      earlyLeaveMinutes,
    },
  })
  if (updated.count === 0) return { error: await serverError('alreadyCheckedOut') }

  revalidatePath('/attendance')
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

  if (data.checkIn) {
    const { isLate, lateMinutes } = isWithinSchedule(new Date(data.checkIn))
    updateData.status = data.status || ((isLate ? 'LATE' : 'PRESENT') as AttendanceStatus)
    updateData.lateMinutes = lateMinutes
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
  const shiftStart = `${String(WORK_START_HOUR).padStart(2, '0')}:${String(WORK_START_MINUTE).padStart(2, '0')}`
  const shiftEnd = `${String(WORK_END_HOUR).padStart(2, '0')}:${String(WORK_END_MINUTE).padStart(2, '0')}`
  const note = `Auto-marked absent. Expected shift: ${shiftStart}-${shiftEnd}`

  const results = await Promise.all(
    employeeIds.map((employeeId) =>
      db.attendanceRecord.upsert({
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
    )
  )

  revalidatePath('/attendance')
  revalidatePath('/manager/attendance')

  return { success: true, count: results.length }
}
