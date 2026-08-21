'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { Users, UserCheck, Calendar, CreditCard, ChevronRight } from 'lucide-react'
import { KPICard, Badge } from '@/components/shared'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

const C = {
  gold: '#D4A843',
  text: '#E0E6F4',
  textSub: '#8B93A8',
  textMuted: '#4A5168',
  border: 'rgba(255,255,255,0.065)',
  surf: '#0D1028',
  surf2: '#131830',
  surf3: '#181E38',
  green: '#22C55E',
  red: '#EF4444',
  amber: '#F59E0B',
  blue: '#4B8BF0',
  purple: '#8B5CF6',
  teal: '#0FC8BA',
}



function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; dataKey?: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-[#181E38] border border-[rgba(255,255,255,0.065)] px-3.5 py-2.5">
      <div className="text-[12px] text-[#8B93A8] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-[13px] font-semibold" style={{ color: p.color || C.gold }}>
          {p.name}: {p.dataKey === 'total' ? `AED ${Number(p.value).toLocaleString()}` : p.value}
        </div>
      ))}
    </div>
  )
}

export default function DashboardContent({
  totalEmployees,
  presentCount,
  pendingLeaves,
  payrollTrend,
  weeklyAttendance,
  leaveDistribution,
  payrollKpi,
}: {
  totalEmployees: number
  presentCount: number
  pendingLeaves: number
  payrollTrend: { monthKey: string; total: number }[]
  weeklyAttendance: { day: string; present: number; late: number; absent: number }[]
  leaveDistribution: { name: string; value: number }[]
  payrollKpi: { total: number; source: 'period' | 'salaries' }
}) {
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('dashboard')
  const dateLocale = locale === 'ar' ? 'ar-AE' : 'en-GB'
  const presentRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0
  const ltLabel = (name: string) =>
    ['Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Hajj/Umrah', 'Compassionate', 'Unpaid', 'Other'].includes(name)
      ? t(`leaveTypes.${name === 'Hajj/Umrah' ? 'HajjUmrah' : name}`)
      : name
  const pieColors = [C.green, C.red, C.purple, C.blue, C.amber]

  return (
    <div className="fi">
      <div className="mb-7">
        <h1 className="font-syne text-2xl font-bold text-[#E0E6F4] tracking-tight">{t('hrTitle')}</h1>
        <p className="text-[13px] text-[#8B93A8] mt-1">
          {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {t('location')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard icon={Users} col={C.gold} label={t('totalEmployees')} value={String(totalEmployees)} sub={t('kpiTotalSub')} />
        <KPICard icon={UserCheck} col={C.green} label={t('todayAttendance')} value={`${presentCount} / ${totalEmployees}`} sub={t('kpiPresentSub')} trend={`${presentRate}%`} up={presentRate > 50} />
        <KPICard icon={Calendar} col={C.blue} label={t('kpiLeavesLabel')} value={String(pendingLeaves)} sub={t('kpiLeavesSub')} />
          <KPICard icon={CreditCard} col={C.teal} label={t('kpiPayrollLabel')} value={`AED ${payrollKpi.total.toLocaleString()}`} sub={payrollKpi.source === 'salaries' ? `${t('kpiPayrollSub')} · ${t('payrollEstimateNote')}` : t('kpiPayrollSub')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="font-syne text-[15px] font-bold text-[#E0E6F4]">{t('payrollTrend')}</div>
              <div className="text-[12px] text-[#8B93A8] mt-0.5">{t('payrollTrendRange')}</div>
            </div>
            <Badge variant="gold">{t('aedPerMonth')}</Badge>
          </div>
          {payrollTrend.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[#8B93A8]">{t('noData')}</div>
          ) : (
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={payrollTrend}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.gold} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="monthKey" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v / 1000}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" name={t('series.total')} stroke={C.gold} strokeWidth={2} fill="url(#pg)" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="font-syne text-[15px] font-bold text-[#E0E6F4]">{t('weeklyAttendance')}</div>
              <div className="text-[12px] text-[#8B93A8] mt-0.5">{t('currentWeek')}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={weeklyAttendance} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tickFormatter={(d: string) => t(`days.${d.charAt(0)}${d.slice(1).toLowerCase()}`)} tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="present" name={t('present')} fill={C.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name={t('series.late')} fill={C.amber} radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name={t('series.absent')} fill={C.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
          <div className="font-syne text-[15px] font-bold text-[#E0E6F4] mb-5">{t('leaveDistribution')}</div>
          {leaveDistribution.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[#8B93A8]">{t('noData')}</div>
          ) : (
          <div className="flex items-center gap-5">
            <PieChart width={140} height={140}>
              <Pie data={leaveDistribution} cx={65} cy={65} innerRadius={40} outerRadius={64} paddingAngle={3} dataKey="value">
                {leaveDistribution.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Pie>
            </PieChart>
            <div className="flex-1">
              {leaveDistribution.map((d, i) => (
                <div key={i} className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-[7px] h-[7px] rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                    <span className="text-[12.5px] text-[#8B93A8]">{ltLabel(d.name)}</span>
                  </div>
                  <span className="text-[12.5px] font-semibold text-[#E0E6F4]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="font-syne text-[15px] font-bold text-[#E0E6F4]">{t('pendingActions')}</div>
            <Badge variant="amber">{t('nPending', { n: pendingLeaves })}</Badge>
          </div>
          <div className="flex items-center justify-center py-8 text-[#8B93A8] text-[13px]">
            {pendingLeaves > 0
              ? t('leaveRequestsAwaiting', { count: pendingLeaves })
              : t('noPendingActions')}
          </div>
          <Link
            href={`/${locale}/manager/leaves`}
            className={buttonVariants({ variant: "outline", className: "w-full justify-center" })}
          >
            {t('viewAllRequests')} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
