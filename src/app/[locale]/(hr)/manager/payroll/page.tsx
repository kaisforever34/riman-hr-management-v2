import { auth } from '@/lib/auth'
import { getPayrollPeriods, getEmployeePayslips } from '@/lib/queries/payroll'
import { resolveSelectedEmployee } from '@/lib/queries/employee-picker'
import { PayrollClient } from './payroll-client'

export const dynamic = 'force-dynamic'

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const { employee: employeeParam } = await searchParams
  const { employee, employees } = await resolveSelectedEmployee(employeeParam)

  const [periods, payslips] = await Promise.all([
    getPayrollPeriods(),
    employee ? getEmployeePayslips(employee.id) : Promise.resolve([]),
  ])

  return (
    <PayrollClient
      employeeId={employee?.id ?? ''}
      employees={employees}
      payslips={JSON.parse(JSON.stringify(payslips))}
      periods={JSON.parse(JSON.stringify(periods))}
    />
  )
}
