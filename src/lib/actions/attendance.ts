'use server'

import { db } from '@/lib/db'
import { manualCheckInSchema, managerOverrideSchema } from '@/lib/validations/attendance'
import { auth } from '@/lib/auth'
import { getTodayUaeDate, isWithinSchedule, getEarlyLeaveMinutes } from '@/lib/schedule'
import { revalidatePath } from 'next/cache'

export async function checkIn() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee record not found' }

  const today = getTodayUaeDate()
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  })
  if (existing?.checkIn) return { error: 'Already checked in today' }

  const now = new Date()
  const { isLate, lateMinutes } = isWithinSchedule(now)

  await db.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    update: {
      checkIn: now,
      status: isLate ? 'LATE' : 'PRESENT',
      lateMinutes,
      checkInMethod: 'CLICK',
      checkInNote: null,
    },
    create: {
      employeeId: employee.id,
      date: today,
      checkIn: now,
      status: isLate ? 'LATE' : 'PRESENT',
      lateMinutes,
      checkInMethod: 'CLICK',
    },
  })

  revalidatePath('/attendance')
}

export async function manualCheckIn(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee record not found' }

  const parsed = manualCheckInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const now = new Date()
  const checkInTime = new Date(parsed.data.checkIn)
  if (checkInTime > now) return { error: 'Check-in time cannot be in the future' }

  const today = getTodayUaeDate()
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  })
  if (existing?.checkIn) return { error: 'Already checked in today' }

  const { isLate, lateMinutes } = isWithinSchedule(checkInTime)

  await db.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    update: {
      checkIn: checkInTime,
      status: isLate ? 'LATE' : 'PRESENT',
      lateMinutes,
      checkInMethod: 'MANUAL',
      checkInNote: parsed.data.note,
    },
    create: {
      employeeId: employee.id,
      date: today,
      checkIn: checkInTime,
      status: isLate ? 'LATE' : 'PRESENT',
      lateMinutes,
      checkInMethod: 'MANUAL',
      checkInNote: parsed.data.note,
    },
  })

  revalidatePath('/attendance')
}

export async function checkOut() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee record not found' }

  const today = getTodayUaeDate()
  const record = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  })
  if (!record?.checkIn) return { error: 'Not checked in yet' }
  if (record?.checkOut) return { error: 'Already checked out today' }

  const now = new Date()
  const earlyLeaveMinutes = getEarlyLeaveMinutes(now)

  await db.attendanceRecord.update({
    where: { id: record.id },
    data: {
      checkOut: now,
      checkOutMethod: 'CLICK',
      earlyLeaveMinutes,
    },
  })

  revalidatePath('/attendance')
}

export async function managerOverrideAttendance(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: 'Unauthorized' }

  const parsed = managerOverrideSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const date = new Date(data.date)
  const employee = await db.employee.findUnique({ where: { id: data.employeeId } })
  if (!employee) return { error: 'Employee not found' }

  const updateData: Record<string, unknown> = {
    adjustedById: session.user.id,
  }

  if (data.checkIn) updateData.checkIn = new Date(data.checkIn)
  if (data.checkOut) updateData.checkOut = new Date(data.checkOut)
  if (data.status) updateData.status = data.status
  if (data.note) updateData.checkInNote = data.note

  if (data.checkIn) {
    const { isLate, lateMinutes } = isWithinSchedule(new Date(data.checkIn))
    updateData.status = data.status || (isLate ? 'LATE' : 'PRESENT')
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

  revalidatePath('/manager/attendance')
  revalidatePath('/manager/attendance/reports')
}
