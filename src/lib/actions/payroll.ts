'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { serverError } from '@/lib/errors'
import { isApprover } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { createPayrollPeriodSchema } from '@/lib/validations/payroll'
import { getAppSetting, getActiveEmployeesForPayroll } from '@/lib/queries/payroll'
import { startOfMonth, endOfMonth } from 'date-fns'

const DAILY_RATE_DIVISOR = 30
const HOURS_PER_WORKDAY = 9
const OT_PREMIUM_RATE = 1.25

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function overlapDays(reqStart: Date, reqEnd: Date, periodStart: Date, periodEnd: Date): number {
  const overlapStart = reqStart > periodStart ? reqStart : periodStart
  const overlapEnd = reqEnd < periodEnd ? reqEnd : periodEnd
  const ms = overlapEnd.getTime() - overlapStart.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
}

async function getNumericAppSetting(key: string, fallback: number): Promise<number> {
  const val = await getAppSetting(key)
  return val ? parseFloat(val) : fallback
}

async function getTransportationAmount(): Promise<number> {
  return getNumericAppSetting('TRANSPORTATION_AMOUNT', 500)
}

async function getGpssaRates(): Promise<{ employeeRate: number; employerRate: number }> {
  const [employeeRate, employerRate] = await Promise.all([
    getNumericAppSetting('GPSSA_EMPLOYEE_RATE', 5),
    getNumericAppSetting('GPSSA_EMPLOYER_RATE', 12.5),
  ])
  return { employeeRate, employerRate }
}

async function computeAnnualLeaveAndAbsences(
  employeeIds: string[],
  periodStart: Date,
  periodEnd: Date,
): Promise<Map<string, { annualLeaveDays: number; absentDays: number }>> {
  const result = new Map<string, { annualLeaveDays: number; absentDays: number }>()
  for (const id of employeeIds) result.set(id, { annualLeaveDays: 0, absentDays: 0 })

  const annualLeaveType = await db.leaveType.findUnique({ where: { name: 'Annual' } })

  if (annualLeaveType) {
    const requests = await db.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        leaveTypeId: annualLeaveType.id,
        status: 'APPROVED',
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      select: { employeeId: true, startDate: true, endDate: true, durationDays: true },
    })

    for (const req of requests) {
      const entry = result.get(req.employeeId)
      if (!entry) continue
      const requestDays = Math.floor((req.endDate.getTime() - req.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const overlap = overlapDays(req.startDate, req.endDate, periodStart, periodEnd)
      entry.annualLeaveDays += (req.durationDays / requestDays) * overlap
    }
  }

  const absentCounts = await db.attendanceRecord.groupBy({
    by: ['employeeId'],
    where: {
      employeeId: { in: employeeIds },
      date: { gte: periodStart, lte: periodEnd },
      status: 'ABSENT',
    },
    _count: { _all: true },
  })
  for (const row of absentCounts) {
    const entry = result.get(row.employeeId)
    if (entry) entry.absentDays = row._count._all
  }

  for (const entry of result.values()) {
    entry.annualLeaveDays = Math.round(entry.annualLeaveDays)
  }

  return result
}

async function computeLateDeductions(
  employeeIds: string[],
  periodStart: Date,
  periodEnd: Date,
  basicSalaryMap: Map<string, number>,
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  for (const id of employeeIds) result.set(id, 0)

  const lateRecords = await db.attendanceRecord.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: { gte: periodStart, lte: periodEnd },
      lateMinutes: { gt: 0 },
    },
    select: { employeeId: true, lateMinutes: true },
  })

  for (const record of lateRecords) {
    const basicSalary = basicSalaryMap.get(record.employeeId) ?? 0
    if (basicSalary <= 0) continue
    const hourlyRate = basicSalary / DAILY_RATE_DIVISOR / HOURS_PER_WORKDAY
    const deduction = (record.lateMinutes / 60) * hourlyRate
    const current = result.get(record.employeeId) ?? 0
    result.set(record.employeeId, current + deduction)
  }

  for (const [id, val] of result) {
    result.set(id, round2(val))
  }

  return result
}

async function computeOvertimePay(
  employeeIds: string[],
  periodStart: Date,
  periodEnd: Date,
  basicSalaryMap: Map<string, number>,
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  for (const id of employeeIds) result.set(id, 0)

  const approvedOvertime = await db.overtimeRecord.findMany({
    where: {
      employeeId: { in: employeeIds },
      status: 'APPROVED',
      date: { gte: periodStart, lte: periodEnd },
    },
    select: { employeeId: true, minutes: true },
  })

  for (const record of approvedOvertime) {
    const basicSalary = basicSalaryMap.get(record.employeeId) ?? 0
    if (basicSalary <= 0) continue
    const hourlyRate = basicSalary / DAILY_RATE_DIVISOR / HOURS_PER_WORKDAY
    const hours = record.minutes / 60
    const pay = hours * hourlyRate * OT_PREMIUM_RATE
    const current = result.get(record.employeeId) ?? 0
    result.set(record.employeeId, current + pay)
  }

  for (const [id, val] of result) {
    result.set(id, round2(val))
  }

  return result
}

async function computePayslipData(
  employees: Awaited<ReturnType<typeof getActiveEmployeesForPayroll>>,
  periodStart: Date,
  periodEnd: Date,
) {
  const employeeIds = employees.map((e) => e.id)

  const basicSalaryMap = new Map<string, number>()
  for (const emp of employees) {
    basicSalaryMap.set(emp.id, emp.basicSalary)
  }

  const [leaveAbsences, gpssaRates, lateDeductions, overtimePayMap] = await Promise.all([
    computeAnnualLeaveAndAbsences(employeeIds, periodStart, periodEnd),
    getGpssaRates(),
    computeLateDeductions(employeeIds, periodStart, periodEnd, basicSalaryMap),
    computeOvertimePay(employeeIds, periodStart, periodEnd, basicSalaryMap),
  ])

  const transportationAmount = await getTransportationAmount()

  return employees.map((emp) => {
    const { annualLeaveDays, absentDays } = leaveAbsences.get(emp.id) ?? { annualLeaveDays: 0, absentDays: 0 }
    const basicSalary = emp.basicSalary
    const housingAllowance = emp.housingAllowance
    const transportAllowance = emp.transportAllowance
    const otherAllowances = emp.otherAllowances

    const totalGross = basicSalary + housingAllowance + transportAllowance + otherAllowances

    const gpssaEmployee = round2(basicSalary * (gpssaRates.employeeRate / 100))
    const gpssaEmployer = round2(basicSalary * (gpssaRates.employerRate / 100))

    const overtimePay = overtimePayMap.get(emp.id) ?? 0

    const absenceDeduction = round2((basicSalary / DAILY_RATE_DIVISOR) * absentDays)
    const lateDeduction = lateDeductions.get(emp.id) ?? 0
    const transportationDeduction = round2((transportationAmount / DAILY_RATE_DIVISOR) * annualLeaveDays)

    const totalDeductions = round2(gpssaEmployee + absenceDeduction + lateDeduction + transportationDeduction)

    const netPay = round2(totalGross + overtimePay - totalDeductions)

    return {
      employeeId: emp.id,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      totalGross,
      gpssaEmployee,
      gpssaEmployer,
      overtimePay,
      bonusPay: 0,
      absenceDeduction,
      lateDeduction,
      transportationDeduction,
      totalDeductions,
      eosbAmount: 0,
      netPay,
    }
  })
}

export async function createPayrollPeriod(formData: FormData) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const parsed = createPayrollPeriodSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidMonthYear') }

  const { month, year } = parsed.data

  const existing = await db.payrollPeriod.findUnique({
    where: { month_year: { month, year } },
  })
  if (existing) return { error: await serverError('periodExists') }

  const periodStart = startOfMonth(new Date(year, month - 1))
  const periodEnd = endOfMonth(periodStart)
  const employees = await getActiveEmployeesForPayroll()

  if (employees.length === 0) return { error: await serverError('noActiveEmployees') }

  const payslipData = await computePayslipData(employees, periodStart, periodEnd)

  const period = await db.$transaction(async (tx) => {
    const created = await tx.payrollPeriod.create({
      data: { month, year, status: 'DRAFT' },
    })
    await tx.payslip.createMany({
      data: payslipData.map((p) => ({ ...p, payrollPeriodId: created.id })),
    })
    return created
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    action: 'PAYROLL_PERIOD_CREATED',
    entityType: 'PayrollPeriod',
    entityId: period.id,
    detail: { month, year, payslipCount: payslipData.length },
  })

  revalidatePath('/manager/payroll')
  redirect(`/manager/payroll/${period.id}`)
}

export async function recalculatePayslips(formData: FormData) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const periodId = formData.get('periodId') as string
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
  if (!period || period.status !== 'DRAFT') return { error: await serverError('periodNotFoundOrFinalized') }

  const periodStart = startOfMonth(new Date(period.year, period.month - 1))
  const periodEnd = endOfMonth(periodStart)
  const existingPayslips = await db.payslip.findMany({ where: { payrollPeriodId: periodId } })

  const employeeIds = existingPayslips.map((s) => s.employeeId)
  const employees = await db.employee.findMany({
    where: { id: { in: employeeIds } },
  })

  const basicSalaryMap = new Map<string, number>()
  for (const emp of employees) {
    basicSalaryMap.set(emp.id, emp.basicSalary)
  }

  const [leaveAbsences, gpssaRates, lateDeductions, overtimePayMap] = await Promise.all([
    computeAnnualLeaveAndAbsences(employeeIds, periodStart, periodEnd),
    getGpssaRates(),
    computeLateDeductions(employeeIds, periodStart, periodEnd, basicSalaryMap),
    computeOvertimePay(employeeIds, periodStart, periodEnd, basicSalaryMap),
  ])

  const transportationAmount = await getTransportationAmount()

  await db.$transaction(async (tx) => {
    for (const slip of existingPayslips) {
      const emp = employees.find((e) => e.id === slip.employeeId)
      if (!emp) continue

      const { annualLeaveDays, absentDays } = leaveAbsences.get(slip.employeeId) ?? { annualLeaveDays: 0, absentDays: 0 }
      const basicSalary = emp.basicSalary
      const housingAllowance = emp.housingAllowance
      const transportAllowance = emp.transportAllowance
      const otherAllowances = emp.otherAllowances

      const totalGross = basicSalary + housingAllowance + transportAllowance + otherAllowances

      const gpssaEmployee = round2(basicSalary * (gpssaRates.employeeRate / 100))
      const gpssaEmployer = round2(basicSalary * (gpssaRates.employerRate / 100))

      const overtimePay = overtimePayMap.get(slip.employeeId) ?? 0

      const absenceDeduction = round2((basicSalary / DAILY_RATE_DIVISOR) * absentDays)
      const lateDeduction = lateDeductions.get(slip.employeeId) ?? 0
      const transportationDeduction = round2((transportationAmount / DAILY_RATE_DIVISOR) * annualLeaveDays)

      const totalDeductions = round2(gpssaEmployee + absenceDeduction + lateDeduction + transportationDeduction)
      const netPay = round2(totalGross + overtimePay + Number(slip.bonusPay) - totalDeductions)

      await tx.payslip.update({
        where: { id: slip.id },
        data: {
          basicSalary,
          housingAllowance,
          transportAllowance,
          otherAllowances,
          totalGross,
          gpssaEmployee,
          gpssaEmployer,
          overtimePay,
          absenceDeduction,
          lateDeduction,
          transportationDeduction,
          totalDeductions,
          netPay,
        },
      })
    }
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    action: 'PAYROLL_RECALCULATED',
    entityType: 'PayrollPeriod',
    entityId: periodId,
    detail: { payslipCount: existingPayslips.length },
  })

  revalidatePath(`/manager/payroll/${periodId}`)
}

export async function finalizePayroll(formData: FormData) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const periodId = formData.get('periodId') as string
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
  if (!period || period.status !== 'DRAFT') return { error: await serverError('periodNotFoundOrFinalized') }

  await db.payrollPeriod.update({
    where: { id: periodId },
    data: { status: 'FINALIZED', processedAt: new Date(), processedById: session.user.id },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    action: 'PAYROLL_FINALIZED',
    entityType: 'PayrollPeriod',
    entityId: periodId,
    detail: { month: period.month, year: period.year },
  })

  revalidatePath('/manager/payroll')
  revalidatePath(`/manager/payroll/${periodId}`)
}

export async function calculateEOSB(employeeId: string) {
  const employee = await db.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return { error: await serverError('employeeNotFound') }
  if (!employee.terminationDate) return { error: await serverError('invalidInput') }

  const hireDate = new Date(employee.hireDate)
  const terminationDate = new Date(employee.terminationDate)
  const yearsOfService =
    (terminationDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

  const lastSalary = employee.salary
  const dailyRate = lastSalary / DAILY_RATE_DIVISOR

  let totalDays = 0
  let remainingYears = yearsOfService

  const firstFiveYears = Math.min(remainingYears, 5)
  totalDays += firstFiveYears * 21
  remainingYears -= firstFiveYears

  if (remainingYears > 0) {
    totalDays += remainingYears * 30
  }

  let eosbAmount = totalDays * dailyRate

  const eosbCapSetting = await getAppSetting('EOSB_CAP_MONTHS')
  const capMonths = eosbCapSetting ? parseFloat(eosbCapSetting) : 24
  const twoYearSalaryCap = lastSalary * capMonths
  if (eosbAmount > twoYearSalaryCap) {
    eosbAmount = twoYearSalaryCap
  }

  eosbAmount = round2(eosbAmount)

  const record = await db.eosbRecord.create({
    data: {
      employeeId,
      terminationDate,
      yearsOfService: round2(yearsOfService),
      lastSalary,
      eosbAmount,
    },
  })

  return { record, eosbAmount }
}

export async function getOvertimePayrollData(
  employeeId: string,
  month: number,
  year: number,
) {
  const periodStart = startOfMonth(new Date(year, month - 1))
  const periodEnd = endOfMonth(periodStart)

  const employee = await db.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return { error: await serverError('employeeNotFound') }

  const approvedOvertime = await db.overtimeRecord.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      date: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { date: 'asc' },
  })

  const totalMinutes = approvedOvertime.reduce((sum, r) => sum + r.minutes, 0)
  const totalHours = totalMinutes / 60

  const hourlyRate = employee.basicSalary / DAILY_RATE_DIVISOR / HOURS_PER_WORKDAY
  const totalPay = round2(totalHours * hourlyRate * OT_PREMIUM_RATE)

  return {
    records: approvedOvertime,
    totalMinutes,
    totalHours: round2(totalHours),
    hourlyRate: round2(hourlyRate),
    totalPay,
  }
}
