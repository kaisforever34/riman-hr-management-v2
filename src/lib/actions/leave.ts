'use server'

import { db } from '@/lib/db'
import { submitLeaveSchema, approveLeaveSchema, rejectLeaveSchema, cancelLeaveSchema, setAllocationSchema } from '@/lib/validations/leave'
import { auth } from '@/lib/auth'
import { uploadLeaveAttachment } from '@/lib/upload'
import { getOrCreateLeaveBalance } from '@/lib/queries/leave'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createNotifications, createNotification, getApproverUserIds } from './notifications'
import { serverError } from '@/lib/errors'
import { countWorkingDays, isWorkingDay, toUaeDateKey } from '@/lib/working-days'
import { logAudit } from '@/lib/audit'

export async function submitLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: await serverError('employeeRecordNotFound') }

  const raw = {
    leaveTypeId: formData.get('leaveTypeId') as string,
    startDate: formData.get('startDate') as string,
    endDate: formData.get('endDate') as string,
    isHalfDay: formData.get('isHalfDay') as string,
    halfDayPeriod: formData.get('halfDayPeriod') as string,
    reason: formData.get('reason') as string,
  }

  const parsed = submitLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: await serverError('validationFailed'), fieldErrors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const isHalfDay = data.isHalfDay === 'true'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (start < today) return { error: await serverError('startDatePast') }
  if (end < start) return { error: await serverError('endDateBeforeStart') }

  const holidays = await db.holiday.findMany({
    where: { date: { gte: start, lte: end } },
    select: { date: true },
  })
  const holidayKeys = new Set(holidays.map((h) => toUaeDateKey(h.date)))
  if (isHalfDay && !isWorkingDay(toUaeDateKey(start), employee.workWeek, holidayKeys)) {
    return { error: await serverError('noWorkingDays') }
  }

  const durationDays = isHalfDay
    ? 0.5
    : countWorkingDays(toUaeDateKey(start), toUaeDateKey(end), employee.workWeek, holidayKeys)

  if (!isHalfDay && durationDays === 0) return { error: await serverError('noWorkingDays') }
  if (!isHalfDay && durationDays > 365) return { error: await serverError('durationExceeds365') }

  const leaveType = await db.leaveType.findUnique({ where: { id: data.leaveTypeId } })
  if (!leaveType || !leaveType.isActive) return { error: await serverError('invalidLeaveType') }

  if (leaveType.requiresAttachment) {
    const file = formData.get('attachment') as File
    if (!file || file.size === 0) return { error: await serverError('sickRequiresAttachment') }
  }

  const overlapping = await db.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  })
  if (overlapping) return { error: await serverError('overlappingRequest') }

  let attachmentFile: string | null = null
  const file = formData.get('attachment') as File
  if (file && file.size > 0) {
    attachmentFile = await uploadLeaveAttachment(file)
    if (!attachmentFile) return { error: await serverError('invalidAttachment') }
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

  const approverIds = await getApproverUserIds(employee.id)
  await createNotifications(
    approverIds,
    'LEAVE_SUBMITTED',
    'New Leave Request',
    `${employee.firstName} ${employee.lastName} requested ${leaveType.name} leave.`,
    `/manager/leaves/${created.id}`,
  )

  revalidatePath('/leave')
  redirect('/leave')
}

export async function approveLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: await serverError('unauthorized') }

  const raw = { id: formData.get('id') as string }
  const parsed = approveLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  const request = await db.leaveRequest.findUnique({
    where: { id: parsed.data.id },
    include: { employee: true, leaveType: true },
  })
  if (!request || request.status !== 'PENDING') return { error: await serverError('requestNotFoundOrProcessed') }

  const now = new Date()

  try {
    await db.$transaction(async (tx) => {
      const balance = await getOrCreateLeaveBalance(request.employeeId, request.leaveTypeId, request.employee.hireDate, tx)

      const remaining = balance.allocated + balance.carriedOver - balance.used
      if (request.durationDays > remaining) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      const updated = await tx.leaveRequest.updateMany({
        where: { id: request.id, status: 'PENDING' },
        data: { status: 'APPROVED', approvedById: session.user.id, approvedAt: now },
      })
      if (updated.count === 0) throw new Error('ALREADY_PROCESSED')

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { used: { increment: request.durationDays } },
      })
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
      return { error: await serverError('insufficientBalance') }
    }
    if (e instanceof Error && e.message === 'ALREADY_PROCESSED') {
      return { error: await serverError('requestNotFoundOrProcessed') }
    }
    throw e
  }

  const empUser = await db.employee.findUnique({
    where: { id: request.employeeId },
    include: { user: true },
  })
  if (empUser) {
    await createNotification(
      empUser.user.id,
      'LEAVE_APPROVED',
      'Leave Approved',
      `Your ${request.leaveType.name} leave from ${request.startDate.toLocaleDateString()} to ${request.endDate.toLocaleDateString()} has been approved.`,
      `/leave/${request.id}`,
    )
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'LEAVE_APPROVED',
    entityType: 'LeaveRequest',
    entityId: request.id,
    detail: { employeeId: request.employeeId, durationDays: request.durationDays },
  })

  revalidatePath('/manager/leaves')
  redirect('/manager/leaves')
}

export async function rejectLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: await serverError('unauthorized') }

  const raw = {
    id: formData.get('id') as string,
    rejectReason: formData.get('rejectReason') as string,
  }
  const parsed = rejectLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: await serverError('rejectReasonRequired') }

  const updated = await db.leaveRequest.updateMany({
    where: { id: parsed.data.id, status: 'PENDING' },
    data: { status: 'REJECTED', rejectReason: parsed.data.rejectReason, approvedById: session.user.id },
  })
  if (updated.count === 0) return { error: await serverError('requestNotFoundOrProcessed') }

  const rejectRequest = await db.leaveRequest.findUnique({
    where: { id: parsed.data.id },
    include: { employee: { include: { user: true } }, leaveType: true },
  })
  if (rejectRequest) {
    await createNotification(
      rejectRequest.employee.user.id,
      'LEAVE_REJECTED',
      'Leave Rejected',
      `Your ${rejectRequest.leaveType?.name ?? ''} leave request has been rejected. Reason: ${parsed.data.rejectReason}`,
      `/leave/${parsed.data.id}`,
    )
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'LEAVE_REJECTED',
    entityType: 'LeaveRequest',
    entityId: parsed.data.id,
    detail: { rejectReason: parsed.data.rejectReason },
  })

  revalidatePath('/manager/leaves')
  redirect('/manager/leaves')
}

export async function cancelLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: await serverError('unauthorized') }

  const raw = { id: formData.get('id') as string }
  const parsed = cancelLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  const request = await db.leaveRequest.findUnique({
    where: { id: parsed.data.id },
    include: { employee: true },
  })
  if (!request) return { error: await serverError('requestNotFound') }
  if (request.status === 'CANCELLED') return { error: await serverError('requestAlreadyCancelled') }

  const isOwner = request.employee.userId === session.user.id
  const isManager = session.user.role === 'MANAGER' || session.user.role === 'HR_ADMIN'
  if (!isOwner && !isManager) return { error: await serverError('unauthorized') }
  if (isOwner && !isManager && request.status !== 'PENDING') return { error: await serverError('cannotCancelProcessed') }

  await db.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: { status: 'CANCELLED' },
    })
    if (updated.count === 0) throw new Error('ALREADY_PROCESSED')

    if (request.status === 'APPROVED') {
      const balance = await tx.leaveBalance.findFirst({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          yearStart: { lte: request.startDate },
          yearEnd: { gte: request.startDate },
        },
      })
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { used: { decrement: request.durationDays } },
        })
      }
    }
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'LEAVE_CANCELLED',
    entityType: 'LeaveRequest',
    entityId: request.id,
    detail: { previousStatus: request.status },
  })

  revalidatePath('/leave')
  revalidatePath('/manager/leaves')
}

export async function setAllocation(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: await serverError('unauthorized') }

  const raw = {
    employeeId: formData.get('employeeId') as string,
    leaveTypeId: formData.get('leaveTypeId') as string,
    allocated: formData.get('allocated') as string,
  }
  const parsed = setAllocationSchema.safeParse(raw)
  if (!parsed.success) return { error: await serverError('invalidAllocation') }

  const employee = await db.employee.findUnique({ where: { id: parsed.data.employeeId } })
  if (!employee) return { error: await serverError('employeeNotFound') }

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
