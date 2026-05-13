import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTodayUaeDate } from '@/lib/schedule'
import { getTodayRecord, getEmployeeAttendanceForMonth } from '@/lib/queries/attendance'
import { AttendanceClient } from './attendance-client'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return null

  const today = getTodayUaeDate()
  const [todayRecord, monthlyRecords] = await Promise.all([
    getTodayRecord(employee.id, today),
    getEmployeeAttendanceForMonth(employee.id, today.getUTCFullYear(), today.getUTCMonth()),
  ])

  return (
    <AttendanceClient
      employeeId={employee.id}
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
