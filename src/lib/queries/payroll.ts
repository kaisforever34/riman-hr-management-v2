import { db } from '@/lib/db'
import { startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export async function getPayrollPeriods() {
  return db.payrollPeriod.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      _count: { select: { payslips: true } },
    },
  })
}

export async function getPayrollPeriod(id: string) {
  return db.payrollPeriod.findUnique({
    where: { id },
    include: {
      payslips: {
        include: {
          employee: { select: { firstName: true, lastName: true, department: true } },
        },
        orderBy: { employeeId: 'asc' },
      },
    },
  })
}

export async function getPayslip(id: string) {
  return db.payslip.findUnique({
    where: { id },
    include: {
      payrollPeriod: true,
      employee: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
          jobTitle: true,
          salary: true,
        },
      },
    },
  })
}

export async function getAnnualLeaveDaysInPeriod(employeeId: string, start: Date, end: Date): Promise<number> {
  const annualLeaveType = await db.leaveType.findUnique({ where: { name: 'Annual' } })
  if (!annualLeaveType) return 0

  const requests = await db.leaveRequest.findMany({
    where: {
      employeeId,
      leaveTypeId: annualLeaveType.id,
      status: 'APPROVED',
      startDate: { lte: end },
      endDate: { gte: start },
    },
  })

  let totalDays = 0
  for (const req of requests) {
    const overlapStart = req.startDate > start ? req.startDate : start
    const overlapEnd = req.endDate < end ? req.endDate : end
    const overlapMs = overlapEnd.getTime() - overlapStart.getTime()
    const overlapDays = Math.floor(overlapMs / (1000 * 60 * 60 * 24)) + 1
    const requestMs = req.endDate.getTime() - req.startDate.getTime()
    const requestDays = Math.floor(requestMs / (1000 * 60 * 60 * 24)) + 1
    totalDays += (req.durationDays / requestDays) * overlapDays
  }

  return Math.round(totalDays)
}

export async function getAbsentDaysInPeriod(employeeId: string, start: Date, end: Date): Promise<number> {
  return db.attendanceRecord.count({
    where: {
      employeeId,
      date: { gte: start, lte: end },
      status: 'ABSENT',
    },
  })
}

export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await db.appSetting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function getActiveEmployeesForPayroll() {
  return db.employee.findMany({
    where: { isActive: true, salary: { gt: 0 } },
    orderBy: { firstName: 'asc' },
  })
}
