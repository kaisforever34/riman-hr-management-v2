'use server'

import { db } from '@/lib/db'
import { createPayrollPeriodSchema, updateLateDeductionSchema } from '@/lib/validations/payroll'
import { auth } from '@/lib/auth'
import { getAnnualLeaveDaysInPeriod, getAbsentDaysInPeriod, getAppSetting, getActiveEmployeesForPayroll } from '@/lib/queries/payroll'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { startOfMonth, endOfMonth } from 'date-fns'

const DAILY_RATE_DIVISOR = 30
const DEFAULT_TRANSPORTATION = 500

async function getTransportationAmount(): Promise<number> {
  const val = await getAppSetting('TRANSPORTATION_AMOUNT')
  return val ? parseInt(val, 10) : DEFAULT_TRANSPORTATION
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
  const transportationAmount = await getTransportationAmount()

  if (employees.length === 0) return { error: 'No active employees with salary' }

  const period = await db.payrollPeriod.create({
    data: { month, year, status: 'DRAFT' },
  })

  for (const emp of employees) {
    const annualLeaveDays = await getAnnualLeaveDaysInPeriod(emp.id, periodStart, periodEnd)
    const absentDays = await getAbsentDaysInPeriod(emp.id, periodStart, periodEnd)
    const salary = Number(emp.salary)
    const dailyRate = salary / DAILY_RATE_DIVISOR
    const transportDeduction = (transportationAmount / DAILY_RATE_DIVISOR) * annualLeaveDays
    const absenceDeduction = dailyRate * absentDays

    await db.payslip.create({
      data: {
        payrollPeriodId: period.id,
        employeeId: emp.id,
        basicSalary: salary,
        transportationDeduction: Math.round(transportDeduction * 100) / 100,
        absenceDeduction: Math.round(absenceDeduction * 100) / 100,
        lateDeduction: 0,
        netPay: salary - Math.round(transportDeduction * 100) / 100 - Math.round(absenceDeduction * 100) / 100,
      },
    })
  }

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

  for (const slip of existingPayslips) {
    const annualLeaveDays = await getAnnualLeaveDaysInPeriod(slip.employeeId, periodStart, periodEnd)
    const absentDays = await getAbsentDaysInPeriod(slip.employeeId, periodStart, periodEnd)
    const salary = Number(slip.basicSalary)
    const dailyRate = salary / DAILY_RATE_DIVISOR
    const transportDeduction = (transportationAmount / DAILY_RATE_DIVISOR) * annualLeaveDays
    const absenceDeduction = dailyRate * absentDays

    await db.payslip.update({
      where: { id: slip.id },
      data: {
        transportationDeduction: Math.round(transportDeduction * 100) / 100,
        absenceDeduction: Math.round(absenceDeduction * 100) / 100,
        netPay: salary - Math.round(transportDeduction * 100) / 100 - Math.round(absenceDeduction * 100) / 100 - Number(slip.lateDeduction),
      },
    })
  }

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
    data: { lateDeduction, netPay: Math.round(netPay * 100) / 100 },
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
