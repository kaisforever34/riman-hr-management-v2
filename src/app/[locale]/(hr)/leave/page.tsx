import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEmployeeLeaveRequests, getEmployeeLeaveBalances, getLeaveTypes, getEmployees } from '@/lib/queries/leave'
import { LeaveClient } from './leave-client'

export const dynamic = 'force-dynamic'

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return null

  const isApprover = session.user.role === 'HR_ADMIN' || session.user.role === 'MANAGER'
  const { employee: employeeParam } = await searchParams

  let employee = null
  let employees: { id: string; firstName: string; lastName: string }[] = []

  if (isApprover) {
    employees = await getEmployees()
    if (employeeParam) {
      employee = await db.employee.findUnique({ where: { id: employeeParam } })
    }
    if (!employee && employees.length > 0) {
      employee = await db.employee.findUnique({ where: { id: employees[0].id } })
    }
  } else {
    employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  }

  if (!employee) return null

  const [requests, balances, leaveTypes] = await Promise.all([
    getEmployeeLeaveRequests(employee.id),
    getEmployeeLeaveBalances(employee.id),
    getLeaveTypes(),
  ])

  return (
    <LeaveClient
      employeeId={employee.id}
      employees={employees}
      isApprover={isApprover}
      leaveTypes={JSON.parse(JSON.stringify(leaveTypes))}
      requests={JSON.parse(JSON.stringify(requests))}
      balances={JSON.parse(JSON.stringify(balances))}
    />
  )
}
