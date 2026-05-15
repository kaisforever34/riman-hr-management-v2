'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { Users, UserCheck, Calendar, CreditCard, ChevronRight } from 'lucide-react'
import { KPICard, Avatar, Badge, type BadgeVariant } from '@/components/shared'

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

const PAYROLL_TREND = [
  { month: 'Dec', total: 312000 },
  { month: 'Jan', total: 318500 },
  { month: 'Feb', total: 335000 },
  { month: 'Mar', total: 328000 },
  { month: 'Apr', total: 342000 },
  { month: 'May', total: 358000 },
]

const ATT_WEEK = [
  { day: 'Sun', present: 6, late: 0, absent: 2 },
  { day: 'Mon', present: 7, late: 2, absent: 1 },
  { day: 'Tue', present: 8, late: 0, absent: 0 },
  { day: 'Wed', present: 7, late: 1, absent: 1 },
  { day: 'Thu', present: 6, late: 1, absent: 2 },
]

const LEAVE_DIST = [
  { name: 'Annual', value: 45, color: C.green },
  { name: 'Sick', value: 22, color: C.red },
  { name: 'Maternity', value: 15, color: C.purple },
  { name: 'Study', value: 10, color: C.blue },
  { name: 'Other', value: 8, color: C.amber },
]

const LEAVE_BADGE_VARIANT: Record<string, BadgeVariant> = {
  'Annual Leave': 'green',
  'Sick Leave': 'red',
  'Maternity Leave': 'purple',
  'Parental Leave': 'teal',
  'Bereavement Leave': 'amber',
  'Study Leave': 'blue',
  'Hajj Leave': 'gold',
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.surf3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, color: p.color || C.gold, fontWeight: 600 }}>
          {p.name}: {p.name === 'total' ? `AED ${Number(p.value).toLocaleString()}` : p.value}
        </div>
      ))}
    </div>
  )
}

export default function DashboardContent({
  totalEmployees,
  presentCount,
  pendingLeaves,
}: {
  totalEmployees: number
  presentCount: number
  pendingLeaves: number
}) {
  const presentRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0

  return (
    <div className="fi">
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-syne text-[24px] font-bold text-[#E0E6F4] tracking-tight">HR Dashboard</h1>
        <p style={{ color: C.textSub, fontSize: 13.5, marginTop: 4 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Dubai, UAE
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard icon={Users} col={C.gold} label="Total Employees" value={String(totalEmployees)} sub="Active" />
        <KPICard icon={UserCheck} col={C.green} label="Present Today" value={`${presentCount} / ${totalEmployees}`} sub="Clocked in" trend={`${presentRate}%`} up={presentRate > 50} />
        <KPICard icon={Calendar} col={C.blue} label="Pending Leaves" value={String(pendingLeaves)} sub="Awaiting approval" />
        <KPICard icon={CreditCard} col={C.teal} label="Payroll" value={`AED ${(totalEmployees * 5000).toLocaleString()}`} sub="Current month" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="font-syne text-[15px] font-bold text-[#E0E6F4]">Payroll Trend</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Dec 2025 – May 2026</div>
            </div>
            <Badge variant="gold">AED / Month</Badge>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={PAYROLL_TREND}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.gold} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={C.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v / 1000}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" name="total" stroke={C.gold} strokeWidth={2} fill="url(#pg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
          <div className="flex justify-between items-center mb-5">
            <div>
              <div className="font-syne text-[15px] font-bold text-[#E0E6F4]">Weekly Attendance</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Current week (Sun–Thu)</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={ATT_WEEK} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="present" name="present" fill={C.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name="late" fill={C.amber} radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="absent" fill={C.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
          <div className="font-syne text-[15px] font-bold text-[#E0E6F4] mb-5">Leave Distribution 2026</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <PieChart width={140} height={140}>
              <Pie data={LEAVE_DIST} cx={65} cy={65} innerRadius={40} outerRadius={64} paddingAngle={3} dataKey="value">
                {LEAVE_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1 }}>
              {LEAVE_DIST.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} />
                    <span style={{ fontSize: 12.5, color: C.textSub }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="font-syne text-[15px] font-bold text-[#E0E6F4]">Pending Actions</div>
            <Badge variant="amber">{pendingLeaves} pending</Badge>
          </div>
          <div className="flex items-center justify-center py-8 text-[#8B93A8] text-[13px]">
            {pendingLeaves > 0
              ? `${pendingLeaves} leave request${pendingLeaves > 1 ? 's' : ''} awaiting review`
              : 'No pending actions'}
          </div>
          <button
            className="w-full mt-3.5 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.065)] text-[13px] font-medium text-[#8B93A8] hover:border-[rgba(255,255,255,0.13)] hover:text-[#E0E6F4] transition-all duration-150 cursor-pointer"
          >
            View all requests <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
