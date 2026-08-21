import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getAttendanceForDateRange, getAllActiveEmployees } from '@/lib/queries/attendance'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AttendanceReportsPage() {
  const t = await getTranslations('managerAttendance')
  const tc = await getTranslations('common')
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  const [records, employees] = await Promise.all([
    getAttendanceForDateRange(monthStart, monthEnd),
    getAllActiveEmployees(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('reportTitle')}</h1>
          <p className="text-sm text-[#8B93A8]">
            {monthStart.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          href={`/api/export/attendance?from=${monthStart.toISOString()}&to=${monthEnd.toISOString()}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          {tc('exportCsv')}
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                  <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('presentDays')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('lateDays')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('absentDays')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('halfDays')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('avgLateMinutes')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const empRecords = records.filter(r => r.employeeId === emp.id)
                  const present = empRecords.filter(r => r.status === 'PRESENT').length
                  const late = empRecords.filter(r => r.status === 'LATE').length
                  const absent = empRecords.filter(r => r.status === 'ABSENT').length
                  const halfDay = empRecords.filter(r => r.status === 'HALF_DAY').length
                  const totalLateMin = empRecords.filter(r => r.status === 'LATE').reduce((sum, r) => sum + r.lateMinutes, 0)
                  const avgLate = late > 0 ? Math.round(totalLateMin / late) : 0

                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="px-4 py-3">{emp.firstName} {emp.lastName}</td>
                      <td className="px-4 py-3">{present}</td>
                      <td className="px-4 py-3">{late}</td>
                      <td className="px-4 py-3">{absent}</td>
                      <td className="px-4 py-3">{halfDay}</td>
                      <td className="px-4 py-3">{avgLate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
