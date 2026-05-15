import { auth } from '@/lib/auth'
import { getTodayUaeDate } from '@/lib/schedule'
import { getTodayRecordsForAllEmployees, getAllActiveEmployees } from '@/lib/queries/attendance'
import { AttendanceTableClient } from './attendance-table-client'

export const dynamic = 'force-dynamic'

export default async function ManagerAttendancePage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const today = getTodayUaeDate()
  const [records, employees] = await Promise.all([
    getTodayRecordsForAllEmployees(today),
    getAllActiveEmployees(),
  ])

  return (
    <AttendanceTableClient
      employees={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName, department: e.department }))}
      records={records.map(r => ({
        ...r,
        checkIn: r.checkIn?.toISOString() ?? null,
        checkOut: r.checkOut?.toISOString() ?? null,
        date: r.date.toISOString(),
        employee: { firstName: r.employee.firstName, lastName: r.employee.lastName, department: r.employee.department },
      }))}
      todayDate={today.toISOString()}
    />
  )
}
