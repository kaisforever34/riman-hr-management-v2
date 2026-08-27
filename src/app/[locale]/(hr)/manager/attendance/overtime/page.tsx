import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOvertimeRecords } from '@/lib/actions/attendance'
import { OvertimeClient } from './overtime-client'

export const dynamic = 'force-dynamic'

export default async function OvertimePage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const [allEmployees, overtimeResult] = await Promise.all([
    db.employee.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, department: true },
      orderBy: { firstName: 'asc' },
    }),
    getOvertimeRecords(),
  ])

  const records = 'data' in overtimeResult && Array.isArray(overtimeResult.data) ? overtimeResult.data : []

  return (
    <OvertimeClient
      employees={allEmployees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName, department: e.department }))}
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
