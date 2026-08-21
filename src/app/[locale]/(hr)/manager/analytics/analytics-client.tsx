'use client'

import { useTranslations } from 'next-intl'
import { Users, Clock, CalendarCheck, Banknote, Star } from 'lucide-react'

type AnalyticsData = {
  totalEmployees: number
  activeEmployees: number
  departmentDistribution: { name: string; count: number }[]
  attendance: { todayPresent: number; todayLate: number; todayAbsent: number; monthPresent: number; monthLate: number; monthAbsent: number }
  leaves: { pendingLeaves: number; approvedLeaves: number; rejectedLeaves: number; leaveByType: { name: string; count: number }[] }
  payrollByDepartment: { name: string; total: number }[]
  ratingDistribution: Record<string, number>
}

export default function AnalyticsClient({ data }: { data: AnalyticsData; locale: string }) {
  const t = useTranslations('analytics')
  const totalAttendance = data.attendance.todayPresent + data.attendance.todayLate + data.attendance.todayAbsent
  const totalPayroll = data.payrollByDepartment.reduce((sum, d) => sum + d.total, 0)
  const maxDept = Math.max(...data.departmentDistribution.map((d) => d.count), 1)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('title')}</h1>
        <p className="text-sm text-[#8B93A8]">{t('description')}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: t('totalEmployees'), value: data.activeEmployees, sub: `${data.totalEmployees} ${t('total')}` },
          { icon: Clock, label: t('todayAttendance'), value: `${totalAttendance}`, sub: `${data.attendance.todayPresent} ${t('present')}` },
          { icon: CalendarCheck, label: t('pendingLeaves'), value: data.leaves.pendingLeaves, sub: `${data.leaves.approvedLeaves} ${t('approved')}` },
          { icon: Banknote, label: t('totalPayroll'), value: `${Math.round(totalPayroll).toLocaleString()} AED`, sub: t('allPeriods') },
        ].map((card, i) => (
          <div key={i} className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <card.icon className="w-4 h-4 text-[#D4A843]" />
              <span className="text-xs text-[#8B93A8]">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#E0E6F4]">{card.value}</p>
            <p className="text-[10px] text-[#5A6278] mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#D4A843]" />
            <h3 className="text-sm font-semibold text-[#E0E6F4]">{t('departmentDistribution')}</h3>
          </div>
          <div className="space-y-2">
            {data.departmentDistribution.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-28 text-xs text-[#8B93A8] truncate">{d.name}</span>
                <div className="flex-1 h-5 bg-[#0F1120] rounded-sm overflow-hidden">
                  <div className="h-full bg-[#D4A843] transition-all" style={{ width: `${(d.count / maxDept) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-xs text-[#E0E6F4] font-medium">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[#D4A843]" />
            <h3 className="text-sm font-semibold text-[#E0E6F4]">{t('attendanceOverview')}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-xs text-[#8B93A8]">{t('today')}</span>
              <div className="flex gap-2 mt-1">
                {[
                  { label: t('present'), count: data.attendance.todayPresent, color: 'bg-[#22A854]' },
                  { label: t('late'), count: data.attendance.todayLate, color: 'bg-[#D4A843]' },
                  { label: t('absent'), count: data.attendance.todayAbsent, color: 'bg-[#EF4444]' },
                ].map((s) => (
                  <div key={s.label} className="flex-1">
                    <div className="h-16 bg-[#0F1120] rounded-t-sm overflow-hidden flex items-end">
                      <div className={`w-full ${s.color} transition-all`} style={{ height: totalAttendance > 0 ? `${(s.count / totalAttendance) * 100}%` : '0%' }} />
                    </div>
                    <p className="text-[10px] text-[#8B93A8] text-center mt-1">{s.count} {s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-[#8B93A8]">{t('thisMonth')}</span>
              <div className="flex items-center gap-3 mt-1 text-xs text-[#E0E6F4]">
                <span><span className="text-[#22A854]">{t('present')}:</span> {data.attendance.monthPresent}</span>
                <span><span className="text-[#D4A843]">{t('late')}:</span> {data.attendance.monthLate}</span>
                <span><span className="text-[#EF4444]">{t('absent')}:</span> {data.attendance.monthAbsent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 text-[#D4A843]" />
            <h3 className="text-sm font-semibold text-[#E0E6F4]">{t('leaveOverview')}</h3>
          </div>
          <div className="flex gap-2 mb-4">
            {[
              { label: t('pending'), count: data.leaves.pendingLeaves, color: 'text-[#D4A843]' },
              { label: t('approved'), count: data.leaves.approvedLeaves, color: 'text-[#22A854]' },
              { label: t('rejected'), count: data.leaves.rejectedLeaves, color: 'text-[#EF4444]' },
            ].map((s) => (
              <div key={s.label} className="flex-1 bg-[#0F1120] rounded-lg p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-[#8B93A8]">{s.label}</p>
              </div>
            ))}
          </div>
          {data.leaves.leaveByType.length > 0 && (
            <div className="space-y-1">
              {data.leaves.leaveByType.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-xs">
                  <span className="text-[#8B93A8]">{t.name}</span>
                  <span className="text-[#E0E6F4] font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-4 h-4 text-[#D4A843]" />
            <h3 className="text-sm font-semibold text-[#E0E6F4]">{t('payrollOverview')}</h3>
          </div>
          <div className="space-y-2">
            {data.payrollByDepartment.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="text-[#8B93A8]">{d.name}</span>
                <span className="text-[#E0E6F4] font-medium">{Math.round(d.total).toLocaleString()} AED</span>
              </div>
            ))}
            {data.payrollByDepartment.length === 0 && <p className="text-xs text-[#5A6278]">{t('noPayrollData')}</p>}
          </div>
          {Object.keys(data.ratingDistribution).length > 0 && (
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.065)]">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-[#D4A843]" />
                <h3 className="text-sm font-semibold text-[#E0E6F4]">{t('performanceRatings')}</h3>
              </div>
              <div className="space-y-1">
                {Object.entries(data.ratingDistribution).map(([rating, count]) => (
                  <div key={rating} className="flex items-center justify-between text-xs">
                    <span className="text-[#8B93A8]">{rating}</span>
                    <span className="text-[#E0E6F4] font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
