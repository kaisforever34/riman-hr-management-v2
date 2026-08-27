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
import { getDaysInMonth } from 'date-fns'
import { countWorkingDays, toUaeDateKey } from '@/lib/working-days'

const DAILY_RATE_DIVISOR = 30
const HOURS_PER_WORKDAY = 9
const OT_PREMIUM_RATE = 0.25

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Build a UTC-midnight period for the given month, immune to server timezone. */
function buildUtcPeriod(year: number, month: number): { periodStart: Date; periodEnd: Date } {
  const periodStart = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = getDaysInMonth(periodStart)
  const periodEnd = new Date(Date.UTC(year, month - 1, daysInMonth))
  return { periodStart, periodEnd }
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

  // Build a per-employee workWeek map with a safe fallback
  const employees = await db.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, workWeek: true },
  })
  const workWeekMap = new Map<string, number[]>()
  const DEFAULT_WORK_WEEK = [0, 1, 2, 3, 4]
  for (const emp of employees) {
    let workWeek = DEFAULT_WORK_WEEK
    try {
      const parsed = JSON.parse(emp.workWeek ?? '') as unknown
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((d) => typeof d === 'number')) {
        workWeek = parsed as number[]
      }
    } catch {
      // fall back to default
    }
    workWeekMap.set(emp.id, workWeek)
  }

  // Fetch holidays overlapping the period once (UAE date keys)
  const holidays = await db.holiday.findMany({
    where: { date: { gte: periodStart, lte: periodEnd } },
    select: { date: true },
  })
  const holidayKeys = new Set(holidays.map((h) => toUaeDateKey(h.date)))

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
      // Count the actual working days in the overlap between the leave request and
      // the payroll period, using the employee's workWeek and period holidays.
      const overlapStart = req.startDate > periodStart ? req.startDate : periodStart
      const overlapEnd = req.endDate < periodEnd ? req.endDate : periodEnd
      const workWeek = workWeekMap.get(req.employeeId) ?? DEFAULT_WORK_WEEK
      const workingDaysInOverlap = countWorkingDays(
        toUaeDateKey(overlapStart),
        toUaeDateKey(overlapEnd),
        workWeek,
        holidayKeys,
      )
      entry.annualLeaveDays += workingDaysInOverlap
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
    result.set(record.employeeId, current + round2(deduction))
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

    const totalGross = round2(basicSalary + housingAllowance + transportAllowance + otherAllowances)

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

  const { periodStart, periodEnd } = buildUtcPeriod(year, month)
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

  const { periodStart, periodEnd } = buildUtcPeriod(period.year, period.month)
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

      const totalGross = round2(basicSalary + housingAllowance + transportAllowance + otherAllowances)

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

export async function updatePayslip(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const payslipId = formData.get('payslipId') as string
  if (!payslipId) return { error: await serverError('invalidRequest') }

  const payslip = await db.payslip.findUnique({ where: { id: payslipId } })
  if (!payslip) return { error: await serverError('invalidRequest') }

  const bonusRaw = formData.get('bonusPay') as string
  const overtimeRaw = formData.get('overtimePay') as string
  const bonusPay = bonusRaw !== null && bonusRaw !== '' ? round2(parseFloat(bonusRaw)) : Number(payslip.bonusPay)
  const overtimePay = overtimeRaw !== null && overtimeRaw !== '' ? round2(parseFloat(overtimeRaw)) : Number(payslip.overtimePay)

  if (isNaN(bonusPay) || bonusPay < 0) return { error: await serverError('invalidInput') }
  if (isNaN(overtimePay) || overtimePay < 0) return { error: await serverError('invalidInput') }

  const netPay = round2(Number(payslip.totalGross) + overtimePay + bonusPay - Number(payslip.totalDeductions))

  await db.payslip.update({
    where: { id: payslipId },
    data: { bonusPay, overtimePay, netPay },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    action: 'PAYSLIP_UPDATED',
    entityType: 'Payslip',
    entityId: payslipId,
    detail: { bonusPay, overtimePay, netPay },
  })

  revalidatePath(`/manager/payroll/${payslip.payrollPeriodId}`)
  revalidatePath(`/manager/payroll/${payslip.payrollPeriodId}/${payslip.employeeId}`)
  return { success: true }
}

export async function finalizePayroll(formData: FormData) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const periodId = formData.get('periodId') as string
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
  if (!period || period.status !== 'DRAFT') return { error: await serverError('periodNotFoundOrFinalized') }

  // Validate payslips before finalizing
  const payslips = await db.payslip.findMany({ where: { payrollPeriodId: periodId } })
  if (payslips.length === 0) {
    return { error: await serverError('invalidInput') }
  }
  const invalidPayslips = payslips.filter((s) => {
    const gross = Number(s.totalGross)
    return Number.isNaN(gross) || gross <= 0
  })
  if (invalidPayslips.length > 0) {
    return { error: await serverError('invalidInput') }
  }

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

export async function getOvertimePayrollData(
  employeeId: string,
  month: number,
  year: number,
) {
  const { periodStart, periodEnd } = buildUtcPeriod(year, month)

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
