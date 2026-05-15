'use server'

import { db } from '@/lib/db'
import { submitLeaveSchema, approveLeaveSchema, rejectLeaveSchema, cancelLeaveSchema, setAllocationSchema } from '@/lib/validations/leave'
import { auth } from '@/lib/auth'
import { uploadLeaveAttachment } from '@/lib/upload'
import { getOrCreateLeaveBalance } from '@/lib/queries/leave'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createNotification } from './notifications'

export async function submitLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee record not found' }

  const raw = {
    leaveTypeId: formData.get('leaveTypeId') as string,
    startDate: formData.get('startDate') as string,
    endDate: formData.get('endDate') as string,
    isHalfDay: formData.get('isHalfDay') as string,
    halfDayPeriod: formData.get('halfDayPeriod') as string,
    reason: formData.get('reason') as string,
  }

  const parsed = submitLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const isHalfDay = data.isHalfDay === 'true'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (start < today) return { error: 'Start date cannot be in the past' }
  if (end < start) return { error: 'End date must be on or after start date' }

  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  const durationDays = isHalfDay ? 0.5 : diffDays

  if (!isHalfDay && durationDays > 365) return { error: 'Duration cannot exceed 365 days' }

  const leaveType = await db.leaveType.findUnique({ where: { id: data.leaveTypeId } })
  if (!leaveType || !leaveType.isActive) return { error: 'Invalid leave type' }

  if (leaveType.requiresAttachment) {
    const file = formData.get('attachment') as File
    if (!file || file.size === 0) return { error: 'Sick leave requires a medical report attachment' }
  }

  const overlapping = await db.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { startDate: { lte: end }, endDate: { gte: start } },
      ],
    },
  })
  if (overlapping) return { error: 'You already have a pending or approved request overlapping these dates' }

  let attachmentFile: string | null = null
  const file = formData.get('attachment') as File
  if (file && file.size > 0) {
    attachmentFile = await uploadLeaveAttachment(file)
    if (!attachmentFile) return { error: 'Invalid attachment file (max 5MB, PDF/JPG/PNG only)' }
  }

  const created = await db.leaveRequest.create({
    data: {
      employeeId: employee.id,
      leaveTypeId: data.leaveTypeId,
      startDate: start,
      endDate: end,
      durationDays,
      isHalfDay,
      halfDayPeriod: isHalfDay ? data.halfDayPeriod : null,
      reason: data.reason,
      attachmentFile,
      status: 'PENDING',
    },
  })

  const managers = await db.user.findMany({
    where: { role: { in: ['HR_ADMIN', 'MANAGER'] }, isActive: true },
  })
  for (const manager of managers) {
    await createNotification(
      manager.id,
      'LEAVE_SUBMITTED',
      'New Leave Request',
      `${employee.firstName} ${employee.lastName} requested ${leaveType.name} leave.`,
      `/manager/leaves/${created.id}`,
    )
  }

  revalidatePath('/leave')
  redirect('/leave')
}

export async function approveLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const raw = { id: formData.get('id') as string }
  const parsed = approveLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid request' }

  const request = await db.leaveRequest.findUnique({
    where: { id: parsed.data.id },
    include: { employee: true },
  })
  if (!request || request.status !== 'PENDING') return { error: 'Request not found or already processed' }

  const now = new Date()
  let balance = await getOrCreateLeaveBalance(request.employeeId, request.leaveTypeId, request.employee.hireDate)
  const yearEnd = new Date(balance.yearEnd)
  if (now > yearEnd) {
    const carriedOver = Math.max(0, balance.allocated + balance.carriedOver - balance.used)
    const yearStart = new Date(balance.yearStart)
    yearStart.setFullYear(yearStart.getFullYear() + 1)
    const newYearEnd = new Date(yearStart)
    newYearEnd.setFullYear(newYearEnd.getFullYear() + 1)
    newYearEnd.setDate(newYearEnd.getDate() - 1)
    const leaveType = await db.leaveType.findUniqueOrThrow({ where: { id: request.leaveTypeId } })
    balance = await db.leaveBalance.create({
      data: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        yearStart,
        yearEnd: newYearEnd,
        allocated: leaveType.defaultDays,
        carriedOver,
        used: 0,
      },
    })
  }

  await db.leaveRequest.update({
    where: { id: parsed.data.id },
    data: { status: 'APPROVED', approvedById: session.user.id, approvedAt: now },
  })

  await db.leaveBalance.update({
    where: { id: balance.id },
    data: { used: balance.used + request.durationDays },
  })

  const reqLeaveType = await db.leaveType.findUnique({ where: { id: request.leaveTypeId } })
  const empUser = await db.employee.findUnique({
    where: { id: request.employeeId },
    include: { user: true },
  })
  if (empUser) {
    await createNotification(
      empUser.user.id,
      'LEAVE_APPROVED',
      'Leave Approved',
      `Your ${reqLeaveType?.name ?? ''} leave from ${request.startDate.toLocaleDateString()} to ${request.endDate.toLocaleDateString()} has been approved.`,
      `/leave/${request.id}`,
    )
  }

  revalidatePath('/manager/leaves')
  redirect('/manager/leaves')
}

export async function rejectLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const raw = {
    id: formData.get('id') as string,
    rejectReason: formData.get('rejectReason') as string,
  }
  const parsed = rejectLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Rejection reason is required' }

  const request = await db.leaveRequest.findUnique({ where: { id: parsed.data.id } })
  if (!request || request.status !== 'PENDING') return { error: 'Request not found or already processed' }

  await db.leaveRequest.update({
    where: { id: parsed.data.id },
    data: { status: 'REJECTED', rejectReason: parsed.data.rejectReason, approvedById: session.user.id },
  })

  const rejectRequest = await db.leaveRequest.findUnique({
    where: { id: parsed.data.id },
    include: { employee: { include: { user: true } }, leaveType: true },
  })
  if (rejectRequest) {
    await createNotification(
      rejectRequest.employee.user.id,
      'LEAVE_REJECTED',
      'Leave Rejected',
      `Your ${rejectRequest.leaveType?.name ?? ''} leave request has been rejected.${rejectRequest.rejectReason ? ` Reason: ${rejectRequest.rejectReason}` : ''}`,
      `/leave/${parsed.data.id}`,
    )
  }

  revalidatePath('/manager/leaves')
  redirect('/manager/leaves')
}

export async function cancelLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const raw = { id: formData.get('id') as string }
  const parsed = cancelLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid request' }

  const request = await db.leaveRequest.findUnique({
    where: { id: parsed.data.id },
    include: { employee: true },
  })
  if (!request) return { error: 'Request not found' }

  const isOwner = request.employee.userId === session.user.id
  const isManager = session.user.role === 'MANAGER'
  if (!isOwner && !isManager) return { error: 'Unauthorized' }
  if (isOwner && !isManager && request.status !== 'PENDING') return { error: 'Cannot cancel a processed request' }

  await db.leaveRequest.update({
    where: { id: parsed.data.id },
    data: { status: 'CANCELLED' },
  })

  if (request.status === 'APPROVED') {
    const balance = await db.leaveBalance.findFirst({
      where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, yearStart: { lte: request.createdAt }, yearEnd: { gte: request.createdAt } },
    })
    if (balance) {
      await db.leaveBalance.update({
        where: { id: balance.id },
        data: { used: { decrement: request.durationDays } },
      })
    }
  }

  revalidatePath('/leave')
  revalidatePath('/manager/leaves')
}

export async function setAllocation(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const raw = {
    employeeId: formData.get('employeeId') as string,
    leaveTypeId: formData.get('leaveTypeId') as string,
    allocated: formData.get('allocated') as string,
  }
  const parsed = setAllocationSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid allocation data' }

  const employee = await db.employee.findUnique({ where: { id: parsed.data.employeeId } })
  if (!employee) return { error: 'Employee not found' }

  const now = new Date()
  const yearStart = new Date(Date.UTC(now.getFullYear(), employee.hireDate.getMonth(), employee.hireDate.getDate()))
  if (yearStart > now) yearStart.setFullYear(yearStart.getFullYear() - 1)
  const yearEnd = new Date(yearStart)
  yearEnd.setFullYear(yearEnd.getFullYear() + 1)
  yearEnd.setDate(yearEnd.getDate() - 1)

  await db.leaveBalance.upsert({
    where: { employeeId_leaveTypeId_yearStart: { employeeId: parsed.data.employeeId, leaveTypeId: parsed.data.leaveTypeId, yearStart } },
    update: { allocated: parsed.data.allocated },
    create: {
      employeeId: parsed.data.employeeId,
      leaveTypeId: parsed.data.leaveTypeId,
      yearStart,
      yearEnd,
      allocated: parsed.data.allocated,
    },
  })

  revalidatePath('/manager/leave-types')
}
