'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { Users, UserCheck, Calendar, CreditCard, ChevronRight } from 'lucide-react'
import { KPICard, Badge } from '@/components/shared'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

/* ------------------------------------------------------------------ */
/* Read CSS custom properties so chart colors adapt to the active theme */
/* ------------------------------------------------------------------ */
function cssVar(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

const FALLBACK_CHART_COLORS = {
  gold:      '#D4A843',
  text:      '#E0E6F4',
  textSub:   '#8B93A8',
  textMuted: '#4A5168',
  green:     '#22C55E',
  red:       '#EF4444',
  blue:      '#4B8BF0',
  purple:    '#8B5CF6',
  teal:      '#0FC8BA',
  amber:     '#F59E0B',
  grid:      'rgba(255,255,255,0.065)',
}

function readChartColors() {
  return {
    gold:      cssVar('--gold',                    FALLBACK_CHART_COLORS.gold),
    text:      cssVar('--ledger-text',             FALLBACK_CHART_COLORS.text),
    textSub:   cssVar('--ledger-text-secondary',   FALLBACK_CHART_COLORS.textSub),
    textMuted: cssVar('--ledger-text-muted',       FALLBACK_CHART_COLORS.textMuted),
    green:     cssVar('--statement-green',         FALLBACK_CHART_COLORS.green),
    red:       cssVar('--audit-red',               FALLBACK_CHART_COLORS.red),
    blue:      cssVar('--inquiry-blue',            FALLBACK_CHART_COLORS.blue),
    purple:    cssVar('--authority-purple',        FALLBACK_CHART_COLORS.purple),
    teal:      cssVar('--statement-teal',          FALLBACK_CHART_COLORS.teal),
    amber:     cssVar('--warning-amber',           FALLBACK_CHART_COLORS.amber),
    grid:      cssVar('--border',                  FALLBACK_CHART_COLORS.grid),
  }
}

function useChartColors() {
  const { resolvedTheme } = useTheme()
  const [colors, setColors] = useState(FALLBACK_CHART_COLORS)
  useEffect(() => {
    setColors(readChartColors())
  }, [resolvedTheme])
  return colors
}

function ChartTooltip({ active, payload, label, colors }: { active?: boolean; payload?: { name: string; dataKey?: string; value: number; color?: string }[]; label?: string; colors: ReturnType<typeof useChartColors> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-accent border border-border px-3.5 py-2.5">
      <div className="text-[12px] text-muted-foreground mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-[13px] font-semibold" style={{ color: p.color || colors.gold }}>
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
  contractExpiring,
  visaExpiring,
}: {
  totalEmployees: number
  presentCount: number
  pendingLeaves: number
  payrollTrend: { monthKey: string; total: number }[]
  weeklyAttendance: { dayIndex: number; present: number; late: number; absent: number }[]
  leaveDistribution: { name: string; value: number }[]
  payrollKpi: { total: number; source: 'period' | 'salaries' }
  contractExpiring: { id: string; firstName: string; lastName: string; jobTitle: string; daysUntilExpiry: number }[]
  visaExpiring: { id: string; firstName: string; lastName: string; iqamaNumber: string | null; daysUntilExpiry: number | null }[]
}) {
  const locale = useLocale()
  const t = useTranslations('dashboard')
  const dateLocale = locale === 'ar' ? 'ar-AE' : 'en-GB'
  const dayFormatter = new Intl.DateTimeFormat(dateLocale, { weekday: 'short' })
  const presentRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0
  const ltLabel = (name: string) =>
    ['Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Hajj/Umrah', 'Compassionate', 'Unpaid', 'Other'].includes(name)
      ? t(`leaveTypes.${name === 'Hajj/Umrah' ? 'HajjUmrah' : name}`)
      : name

  const C = useChartColors()
  const pieColors = [C.green, C.red, C.purple, C.blue, C.amber]

  return (
    <div className="fi">
      <div className="mb-7">
        <h1 className="font-syne text-2xl font-bold text-ledger-text tracking-tight">{t('hrTitle')}</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {t('location')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard icon={Users} col={C.gold} label={t('totalEmployees')} value={String(totalEmployees)} sub={t('kpiTotalSub')} />
        <KPICard icon={UserCheck} col={C.green} label={t('todayAttendance')} value={`${presentCount} / ${totalEmployees}`} sub={t('kpiPresentSub')} trend={`${presentRate}%`} up={presentRate > 50} />
        <KPICard icon={Calendar} col={C.blue} label={t('kpiLeavesLabel')} value={String(pendingLeaves)} sub={t('kpiLeavesSub')} />
        <KPICard icon={CreditCard} col={C.teal} label={t('kpiPayrollLabel')} value={`AED ${payrollKpi.total.toLocaleString()}`} sub={payrollKpi.source === 'salaries' ? `${t('kpiPayrollSub')} · ${t('payrollEstimateNote')}` : t('kpiPayrollSub')} />
      </div>

      {(contractExpiring.length > 0 || visaExpiring.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {contractExpiring.length > 0 && (
            <div className="rounded-xl bg-card border border-warning-amber/25 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-syne text-[15px] font-bold text-ledger-text">{t('contractExpiringSoon')}</div>
                <Badge variant="amber">{String(contractExpiring.length)}</Badge>
              </div>
              <div className="space-y-3">
                {contractExpiring.map((emp) => (
                  <Link key={emp.id} href={`/${locale}/employees/${emp.id}`} className="flex items-center justify-between rounded-md bg-white/3 px-3 py-2 text-[13px] hover:bg-muted/50 transition-colors">
                    <span className="text-ledger-text">{emp.firstName} {emp.lastName} <span className="text-muted-foreground">· {emp.jobTitle}</span></span>
                    <span className="font-semibold text-warning-amber">{t('daysLeft', { n: emp.daysUntilExpiry })}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {visaExpiring.length > 0 && (
            <div className="rounded-xl bg-card border border-audit-red/25 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-syne text-[15px] font-bold text-ledger-text">{t('visaExpiringSoon')}</div>
                <Badge variant="red">{String(visaExpiring.length)}</Badge>
              </div>
              <div className="space-y-3">
                {visaExpiring.map((emp) => (
                  <Link key={emp.id} href={`/${locale}/employees/${emp.id}`} className="flex items-center justify-between rounded-md bg-white/3 px-3 py-2 text-[13px] hover:bg-muted/50 transition-colors">
                    <span className="text-ledger-text">{emp.firstName} {emp.lastName} {emp.iqamaNumber ? <span className="text-muted-foreground">· {emp.iqamaNumber}</span> : null}</span>
                    <span className="font-semibold text-audit-red">{t('daysLeft', { n: emp.daysUntilExpiry ?? 0 })}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="font-syne text-[15px] font-bold text-ledger-text">{t('payrollTrend')}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">{t('payrollTrendRange')}</div>
            </div>
            <Badge variant="gold">{t('aedPerMonth')}</Badge>
          </div>
          {payrollTrend.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-muted-foreground">{t('noData')}</div>
          ) : (
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={payrollTrend}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.gold} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="monthKey" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v / 1000}K`} />
              <Tooltip content={<ChartTooltip colors={C} />} />
              <Area type="monotone" dataKey="total" name={t('series.total')} stroke={C.gold} strokeWidth={2} fill="url(#pg)" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="font-syne text-[15px] font-bold text-ledger-text">{t('weeklyAttendance')}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">{t('currentWeek')}</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={weeklyAttendance} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="dayIndex" tickFormatter={(d: number) => dayFormatter.format(new Date(2024, 0, 7 + d))} tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip colors={C} />} />
              <Bar dataKey="present" name={t('present')} fill={C.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name={t('series.late')} fill={C.amber} radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name={t('series.absent')} fill={C.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="font-syne text-[15px] font-bold text-ledger-text mb-5">{t('leaveDistribution')}</div>
          {leaveDistribution.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-muted-foreground">{t('noData')}</div>
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
                    <span className="text-[12.5px] text-muted-foreground">{ltLabel(d.name)}</span>
                  </div>
                  <span className="text-[12.5px] font-semibold text-ledger-text">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="font-syne text-[15px] font-bold text-ledger-text">{t('pendingActions')}</div>
            <Badge variant="amber">{t('nPending', { n: pendingLeaves })}</Badge>
          </div>
          <div className="flex items-center justify-center py-8 text-muted-foreground text-[13px]">
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