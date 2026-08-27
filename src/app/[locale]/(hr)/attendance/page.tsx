import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTodayUaeDate } from '@/lib/schedule'
import { getTodayRecord, getEmployeeAttendanceForMonth, getAllActiveEmployees } from '@/lib/queries/attendance'
import { AttendanceClient } from './attendance-client'

export const dynamic = 'force-dynamic'

export default async function AttendancePage({
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
    employees = (await getAllActiveEmployees()).map(e => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
    }))
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

  const today = getTodayUaeDate()
  const [todayRecord, monthlyRecords] = await Promise.all([
    getTodayRecord(employee.id, today),
    getEmployeeAttendanceForMonth(employee.id, today.getUTCFullYear(), today.getUTCMonth()),
  ])

  return (
    <AttendanceClient
      employeeId={employee.id}
      employees={employees}
      isApprover={isApprover}
      todayRecord={todayRecord ? {
        ...todayRecord,
        checkIn: todayRecord.checkIn?.toISOString() ?? null,
        checkOut: todayRecord.checkOut?.toISOString() ?? null,
        date: todayRecord.date.toISOString(),
      } : null}
      monthlyRecords={monthlyRecords.map(r => ({
        ...r,
        checkIn: r.checkIn?.toISOString() ?? null,
        checkOut: r.checkOut?.toISOString() ?? null,
        date: r.date.toISOString(),
      }))}
      serverNow={new Date().toISOString()}
    />
  )
}
