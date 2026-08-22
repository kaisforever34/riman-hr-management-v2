import { db } from '@/lib/db'
import { isUniqueConstraintError } from '@/lib/db-errors'
import type { LeaveRequest, LeaveBalance, LeaveType, LeaveStatus, Prisma } from '@prisma/client'

type DbClient = Prisma.TransactionClient | typeof db

export async function getLeaveTypes(): Promise<LeaveType[]> {
  return db.leaveType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
}

export async function getAllLeaveTypes(): Promise<LeaveType[]> {
  return db.leaveType.findMany({ orderBy: { name: 'asc' } })
}

export async function getEmployeeLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  return db.leaveRequest.findMany({
    where: { employeeId },
    include: { leaveType: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLeaveRequestById(id: string): Promise<(LeaveRequest & { leaveType: LeaveType; employee: { firstName: string; lastName: string; user: { email: string } }; approvedBy: { email: string } | null }) | null> {
  return db.leaveRequest.findUnique({
    where: { id },
    include: {
      leaveType: true,
      employee: { include: { user: { select: { email: true } } } },
      approvedBy: { select: { email: true } },
    },
  })
}

export async function getManagerAllRequests(filters?: {
  employeeId?: string
  status?: LeaveStatus
  leaveTypeId?: string
}): Promise<LeaveRequest[]> {
  return db.leaveRequest.findMany({
    where: {
      ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
    },
    include: {
      leaveType: true,
      employee: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getEmployeeLeaveBalances(employeeId: string): Promise<(LeaveBalance & { leaveType: LeaveType })[]> {
  return db.leaveBalance.findMany({
    where: { employeeId },
    include: { leaveType: true },
    orderBy: { leaveType: { name: 'asc' } },
  })
}

export async function getOrCreateLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  hireDate: Date,
  tx?: DbClient,
): Promise<LeaveBalance> {
  const client = tx ?? db
  const now = new Date()
  const yearStart = new Date(Date.UTC(now.getFullYear(), hireDate.getMonth(), hireDate.getDate()))
  if (yearStart > now) {
    yearStart.setFullYear(yearStart.getFullYear() - 1)
  }
  const yearEnd = new Date(yearStart)
  yearEnd.setFullYear(yearEnd.getFullYear() + 1)
  yearEnd.setDate(yearEnd.getDate() - 1)

  const existing = await client.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_yearStart: { employeeId, leaveTypeId, yearStart } },
  })
  if (existing) return existing

  const leaveType = await client.leaveType.findUniqueOrThrow({ where: { id: leaveTypeId } })
  try {
    return await client.leaveBalance.create({
      data: { employeeId, leaveTypeId, yearStart, yearEnd, allocated: leaveType.defaultDays, carriedOver: 0, used: 0 },
    })
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      const created = await client.leaveBalance.findUnique({
        where: { employeeId_leaveTypeId_yearStart: { employeeId, leaveTypeId, yearStart } },
      })
      if (created) return created
    }
    throw e
  }
}

export async function getEmployees(): Promise<{ id: string; firstName: string; lastName: string }[]> {
  return db.employee.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  })
}
