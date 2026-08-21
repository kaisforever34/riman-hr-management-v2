import { Suspense } from 'react'
import { db } from '@/lib/db'
import DashboardContent from '@/components/dashboard/content'
import { getTodayUaeDate } from '@/lib/schedule'
import {
  getPayrollTrend,
  getWeeklyAttendance,
  getLeaveDistribution,
  getPayrollKpi,
} from '@/lib/queries/dashboard'

export const dynamic = 'force-dynamic'

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-[rgba(255,255,255,0.05)]" />
        <div className="h-4 w-72 rounded-md bg-[rgba(255,255,255,0.03)]" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]" />
        ))}
      </div>
    </div>
  )
}

async function DashboardData() {
  const today = getTodayUaeDate()

  const [totalEmployees, todayRecords, pendingLeavesCount] = await Promise.all([
    db.employee.count({ where: { user: { isActive: true } } }),
    db.attendanceRecord.findMany({
      where: { date: today, checkIn: { not: null } },
    }),
    db.leaveRequest.count({ where: { status: 'PENDING' } }),
  ])

  const [payrollTrend, weeklyAttendance, leaveDistribution, payrollKpi] = await Promise.all([
    getPayrollTrend(),
    getWeeklyAttendance(totalEmployees),
    getLeaveDistribution(new Date().getFullYear()),
    getPayrollKpi(),
  ])

  const presentCount = todayRecords.length

  return (
    <DashboardContent
      totalEmployees={totalEmployees}
      presentCount={presentCount}
      pendingLeaves={pendingLeavesCount}
      payrollTrend={payrollTrend}
      weeklyAttendance={weeklyAttendance}
      leaveDistribution={leaveDistribution}
      payrollKpi={payrollKpi}
    />
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  )
}
