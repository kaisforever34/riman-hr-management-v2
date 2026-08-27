import { Suspense } from 'react'
import DashboardContent from '@/components/dashboard/content'
import { getTodayUaeDate } from '@/lib/schedule'
import {
  getPayrollTrend,
  getWeeklyAttendance,
  getLeaveDistribution,
  getPayrollKpi,
  getActiveEmployeeCount,
  getPendingLeaveCount,
  getTodayPresentCount,
} from '@/lib/queries/dashboard'
import { getContractExpiringSoon, getVisaExpiringSoon } from '@/lib/actions/employee'

export const dynamic = 'force-dynamic'

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded-md bg-muted/60" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-card border border-border" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-card border border-border" />
        ))}
      </div>
    </div>
  )
}

async function DashboardData() {
  const today = getTodayUaeDate()

  const [
    totalEmployees,
    presentCount,
    pendingLeavesCount,
    contractExpiring,
    visaExpiring,
  ] = await Promise.all([
    getActiveEmployeeCount(),
    getTodayPresentCount(today),
    getPendingLeaveCount(),
    getContractExpiringSoon(30),
    getVisaExpiringSoon(30),
  ])

  const [payrollTrend, weeklyAttendance, leaveDistribution, payrollKpi] = await Promise.all([
    getPayrollTrend(),
    getWeeklyAttendance(totalEmployees),
    getLeaveDistribution(new Date().getFullYear()),
    getPayrollKpi(),
  ])

  const contractExpiringList = Array.isArray(contractExpiring) ? contractExpiring : []
  const visaExpiringList = Array.isArray(visaExpiring) ? visaExpiring : []

  return (
    <DashboardContent
      totalEmployees={totalEmployees}
      presentCount={presentCount}
      pendingLeaves={pendingLeavesCount}
      payrollTrend={payrollTrend}
      weeklyAttendance={weeklyAttendance}
      leaveDistribution={leaveDistribution}
      payrollKpi={payrollKpi}
      contractExpiring={contractExpiringList}
      visaExpiring={visaExpiringList}
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
