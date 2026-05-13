import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllLeaveTypes, getEmployeeLeaveBalances, getEmployees } from '@/lib/queries/leave'
import LeaveTypesClient from './leave-types-client'

export default async function LeaveTypesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') redirect(`/${locale}/auth/signin`)

  const [leaveTypes, employees] = await Promise.all([
    getAllLeaveTypes(),
    getEmployees(),
  ])

  const employeeBalances = await Promise.all(
    employees.map(async (emp) => {
      const balances = await getEmployeeLeaveBalances(emp.id)
      return { employeeId: emp.id, balances }
    })
  )

  return (
    <LeaveTypesClient
      leaveTypes={JSON.parse(JSON.stringify(leaveTypes))}
      employees={JSON.parse(JSON.stringify(employees))}
      employeeBalances={JSON.parse(JSON.stringify(employeeBalances))}
      locale={locale}
    />
  )
}
