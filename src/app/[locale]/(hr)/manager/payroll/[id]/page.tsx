import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getPayrollPeriod } from '@/lib/queries/payroll'
import { PeriodClient } from './period-client'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const period = await getPayrollPeriod(id)
  if (!period) return notFound()

  return (
    <PeriodClient
      period={{
        id: period.id,
        month: period.month,
        year: period.year,
        status: period.status,
      }}
      payslips={period.payslips.map(s => ({
        id: s.id,
        employeeId: s.employeeId,
        employeeName: `${s.employee.firstName} ${s.employee.lastName}`,
        department: s.employee.department,
        basicSalary: Number(s.basicSalary),
        transportationDeduction: Number(s.transportationDeduction),
        absenceDeduction: Number(s.absenceDeduction),
        lateDeduction: Number(s.lateDeduction),
        netPay: Number(s.netPay),
      }))}
    />
  )
}
