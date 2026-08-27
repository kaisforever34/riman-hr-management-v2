import { auth } from '@/lib/auth'
import { getTodayUaeDate } from '@/lib/schedule'
import { getTodayRecordsForAllEmployees, getAllActiveEmployees } from '@/lib/queries/attendance'
import { AttendanceTableClient } from './attendance-table-client'

export const dynamic = 'force-dynamic'

export default async function ManagerAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const { date: dateParam } = await searchParams
  const today = getTodayUaeDate()

  let selectedDate = today
  if (dateParam) {
    const parsed = new Date(dateParam + 'T00:00:00')
    if (!isNaN(parsed.getTime())) selectedDate = parsed
  }

  const [records, employees] = await Promise.all([
    getTodayRecordsForAllEmployees(selectedDate),
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
      todayDate={selectedDate.toISOString()}
    />
  )
}
