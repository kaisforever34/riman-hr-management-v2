import { auth } from '@/lib/auth'
import { getOvertimeRecords } from '@/lib/actions/attendance'
import { resolveSelectedEmployee } from '@/lib/queries/employee-picker'
import { OvertimeClient } from './overtime-client'

export const dynamic = 'force-dynamic'

export default async function OvertimePage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const { employee: employeeParam } = await searchParams
  const { employee, employees } = await resolveSelectedEmployee(employeeParam)
  if (!employee) return null

  const overtimeResult = await getOvertimeRecords({ employeeId: employee.id })

  const records = 'data' in overtimeResult && Array.isArray(overtimeResult.data) ? overtimeResult.data : []

  return (
    <OvertimeClient
      employees={employees}
      employeeId={employee.id}
      records={records.map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        department: r.employee.department,
        date: r.date.toISOString(),
        minutes: r.minutes,
        reason: r.reason ?? '',
        status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED',
        approvedAt: r.approvedAt?.toISOString() ?? null,
      }))}
    />
  )
}
