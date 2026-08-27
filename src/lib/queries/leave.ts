import { db } from '@/lib/db'
import { isUniqueConstraintError } from '@/lib/db-errors'
import { toUaeDateKey } from '@/lib/working-days'
import type { LeaveRequest, LeaveBalance, LeaveType, Prisma } from '@prisma/client'
import type { LeaveStatus } from '@/lib/types'

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

export function getPeriodStartForDate(hireDate: Date, target: Date): Date {
  const year = Number(toUaeDateKey(target).slice(0, 4))
  const month = hireDate.getUTCMonth()
  const date = hireDate.getUTCDate()
  let yearStart = new Date(Date.UTC(year, month, date))
  // Normalize Feb 29 hires: if the date overflows (e.g., Feb 29 in non-leap year → Mar 1),
  // fall back to the last day of the hire month to keep the anniversary on the correct day.
  if (yearStart.getUTCDate() !== date) {
    yearStart = new Date(Date.UTC(year, month + 1, 0)) // last day of hire month (Feb 28/29)
  }
  if (yearStart > target) {
    yearStart.setUTCFullYear(yearStart.getUTCFullYear() - 1)
    // Re-normalize after year shift (Feb 29 → Feb 28 in non-leap target year)
    if (yearStart.getUTCDate() !== date) {
      yearStart = new Date(Date.UTC(yearStart.getUTCFullYear(), month + 1, 0))
    }
  }
  return yearStart
}

export function getPeriodEndForStart(yearStart: Date): Date {
  const yearEnd = new Date(yearStart)
  yearEnd.setUTCFullYear(yearEnd.getUTCFullYear() + 1)
  yearEnd.setUTCDate(yearEnd.getUTCDate() - 1)
  return yearEnd
}

export async function getOrCreateLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  hireDate: Date,
  tx?: DbClient,
): Promise<LeaveBalance> {
  return getOrCreateLeaveBalanceForDate(employeeId, leaveTypeId, hireDate, new Date(), tx)
}

export async function getOrCreateLeaveBalanceForDate(
  employeeId: string,
  leaveTypeId: string,
  hireDate: Date,
  target: Date,
  tx?: DbClient,
): Promise<LeaveBalance> {
  const client = tx ?? db
  const yearStart = getPeriodStartForDate(hireDate, target)
  const yearEnd = getPeriodEndForStart(yearStart)

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
