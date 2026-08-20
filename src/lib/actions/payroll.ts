'use server'

import { db } from '@/lib/db'
import { createPayrollPeriodSchema, updateLateDeductionSchema } from '@/lib/validations/payroll'
import { auth } from '@/lib/auth'
import { getAppSetting, getActiveEmployeesForPayroll } from '@/lib/queries/payroll'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { startOfMonth, endOfMonth } from 'date-fns'

const DAILY_RATE_DIVISOR = 30
const DEFAULT_TRANSPORTATION = 500

async function getTransportationAmount(): Promise<number> {
  const val = await getAppSetting('TRANSPORTATION_AMOUNT')
  return val ? parseInt(val, 10) : DEFAULT_TRANSPORTATION
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function overlapDays(reqStart: Date, reqEnd: Date, periodStart: Date, periodEnd: Date): number {
  const overlapStart = reqStart > periodStart ? reqStart : periodStart
  const overlapEnd = reqEnd < periodEnd ? reqEnd : periodEnd
  const ms = overlapEnd.getTime() - overlapStart.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
}

async function computeDeductions(
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

export async function createPayrollPeriod(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: 'Unauthorized' }

  const parsed = createPayrollPeriodSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid month or year' }

  const { month, year } = parsed.data

  const existing = await db.payrollPeriod.findUnique({
    where: { month_year: { month, year } },
  })
  if (existing) return { error: 'Payroll period already exists for this month' }

  const periodStart = startOfMonth(new Date(year, month - 1))
  const periodEnd = endOfMonth(periodStart)
  const employees = await getActiveEmployeesForPayroll()

  if (employees.length === 0) return { error: 'No active employees with salary' }

  const transportationAmount = await getTransportationAmount()
  const deductions = await computeDeductions(employees.map((e) => e.id), periodStart, periodEnd)

  const payslipData = employees.map((emp) => {
    const { annualLeaveDays, absentDays } = deductions.get(emp.id) ?? { annualLeaveDays: 0, absentDays: 0 }
    const salary = Number(emp.salary)
    const dailyRate = salary / DAILY_RATE_DIVISOR
    const transportDeduction = round2((transportationAmount / DAILY_RATE_DIVISOR) * annualLeaveDays)
    const absenceDeduction = round2(dailyRate * absentDays)

    return {
      employeeId: emp.id,
      basicSalary: salary,
      transportationDeduction: transportDeduction,
      absenceDeduction,
      lateDeduction: 0,
      netPay: round2(salary - transportDeduction - absenceDeduction),
    }
  })

  const period = await db.$transaction(async (tx) => {
    const created = await tx.payrollPeriod.create({
      data: { month, year, status: 'DRAFT' },
    })
    await tx.payslip.createMany({
      data: payslipData.map((p) => ({ ...p, payrollPeriodId: created.id })),
    })
    return created
  })

  revalidatePath('/manager/payroll')
  redirect(`/manager/payroll/${period.id}`)
}

export async function recalculatePayslips(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: 'Unauthorized' }

  const periodId = formData.get('periodId') as string
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
  if (!period || period.status !== 'DRAFT') return { error: 'Period not found or already finalized' }

  const periodStart = startOfMonth(new Date(period.year, period.month - 1))
  const periodEnd = endOfMonth(periodStart)
  const existingPayslips = await db.payslip.findMany({ where: { payrollPeriodId: periodId } })
  const transportationAmount = await getTransportationAmount()
  const deductions = await computeDeductions(existingPayslips.map((s) => s.employeeId), periodStart, periodEnd)

  await db.$transaction(async (tx) => {
    for (const slip of existingPayslips) {
      const { annualLeaveDays, absentDays } = deductions.get(slip.employeeId) ?? { annualLeaveDays: 0, absentDays: 0 }
      const salary = Number(slip.basicSalary)
      const dailyRate = salary / DAILY_RATE_DIVISOR
      const transportDeduction = round2((transportationAmount / DAILY_RATE_DIVISOR) * annualLeaveDays)
      const absenceDeduction = round2(dailyRate * absentDays)

      await tx.payslip.update({
        where: { id: slip.id },
        data: {
          transportationDeduction: transportDeduction,
          absenceDeduction,
          netPay: round2(salary - transportDeduction - absenceDeduction - Number(slip.lateDeduction)),
        },
      })
    }
  })

  revalidatePath(`/manager/payroll/${periodId}`)
}

export async function updateLateDeduction(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: 'Unauthorized' }

  const parsed = updateLateDeductionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid deduction amount' }

  const slip = await db.payslip.findUnique({
    where: { id: parsed.data.payslipId },
    include: { payrollPeriod: true },
  })
  if (!slip || slip.payrollPeriod.status !== 'DRAFT') return { error: 'Cannot modify finalized payslip' }

  const lateDeduction = parsed.data.lateDeduction
  const basicSalary = Number(slip.basicSalary)
  if (lateDeduction > basicSalary) return { error: 'Late deduction cannot exceed basic salary' }

  const netPay = basicSalary - Number(slip.transportationDeduction) - Number(slip.absenceDeduction) - lateDeduction

  await db.payslip.update({
    where: { id: slip.id },
    data: { lateDeduction, netPay: round2(netPay) },
  })

  revalidatePath(`/manager/payroll/${slip.payrollPeriodId}`)
}

export async function finalizePayroll(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: 'Unauthorized' }

  const periodId = formData.get('periodId') as string
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
  if (!period || period.status !== 'DRAFT') return { error: 'Period not found or already finalized' }

  await db.payrollPeriod.update({
    where: { id: periodId },
    data: { status: 'FINALIZED', processedAt: new Date(), processedById: session.user.id },
  })

  revalidatePath('/manager/payroll')
  revalidatePath(`/manager/payroll/${periodId}`)
}
