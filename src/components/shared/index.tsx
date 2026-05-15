import { TrendingUp, TrendingDown } from 'lucide-react'

const AV_COLS = ['#D4A843', '#0FC8BA', '#8B5CF6', '#4B8BF0', '#EF4444', '#22C55E', '#F59E0B', '#EC4899']

function avCol(ini: string) {
  return AV_COLS[ini.charCodeAt(0) % AV_COLS.length]
}

export function Avatar({ ini, sz = 32 }: { ini: string; sz?: number }) {
  return (
    <div
      style={{
        width: sz,
        height: sz,
        borderRadius: '50%',
        background: `${avCol(ini)}22`,
        border: `1.5px solid ${avCol(ini)}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: sz * 0.33,
        fontWeight: 700,
        color: avCol(ini),
        flexShrink: 0,
        fontFamily: "'Syne', sans-serif",
      }}
    >
      {ini}
    </div>
  )
}

const STATUS_MAP: Record<string, [BadgeVariant, string]> = {
  pending:  ['amber', 'Pending'],
  approved: ['green', 'Approved'],
  rejected: ['red', 'Rejected'],
  active:   ['green', 'Active'],
  probation: ['amber', 'Probation'],
  absent:   ['red', 'Absent'],
  present:  ['green', 'Present'],
  late:     ['amber', 'Late'],
  leave:    ['blue', 'On Leave'],
}

export function StatusBadge({ status }: { status: string }) {
  const pair = STATUS_MAP[status]
  if (!pair) return <Badge>{status}</Badge>
  return <Badge variant={pair[0]}>{pair[1]}</Badge>
}

const LEAVE_BADGE: Record<string, BadgeVariant> = {
  'Annual Leave': 'green',
  'Sick Leave': 'red',
  'Maternity Leave': 'purple',
  'Parental Leave': 'teal',
  'Bereavement Leave': 'amber',
  'Study Leave': 'blue',
  'Hajj Leave': 'gold',
  'Compassionate Leave': 'default',
}

export function LeaveBadge({ type }: { type: string }) {
  return <Badge variant={(LEAVE_BADGE[type] || 'default') as BadgeVariant}>{type}</Badge>
}

export type BadgeVariant = 'default' | 'secondary' | 'gold' | 'green' | 'red' | 'blue' | 'teal' | 'amber' | 'purple'

export function Badge({ variant = 'default', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const variants: Record<string, string> = {
    default: 'bg-[rgba(255,255,255,0.05)] text-[#8B93A8] border border-[rgba(255,255,255,0.065)]',
    secondary: 'bg-[#131830] text-[#E0E6F4] border border-[rgba(255,255,255,0.065)]',
    gold: 'bg-[rgba(212,168,67,0.12)] text-[#D4A843] border border-[rgba(212,168,67,0.2)]',
    green: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border border-[rgba(34,197,94,0.2)]',
    red: 'bg-[rgba(239,68,68,0.08)] text-[#EF4444] border border-[rgba(239,68,68,0.15)]',
    blue: 'bg-[rgba(75,139,240,0.1)] text-[#4B8BF0] border border-[rgba(75,139,240,0.2)]',
    teal: 'bg-[rgba(15,200,186,0.1)] text-[#0FC8BA] border border-[rgba(15,200,186,0.2)]',
    amber: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]',
    purple: 'bg-[rgba(139,92,246,0.1)] text-[#8B5CF6] border border-[rgba(139,92,246,0.2)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap ${variants[variant] || variants.default}`}>
      {children}
    </span>
  )
}

export function KPICard({
  icon: Icon,
  col,
  label,
  value,
  sub,
  trend,
  up,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  col: string
  label: string
  value: string
  sub?: string
  trend?: string
  up?: boolean
}) {
  return (
    <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-5 relative overflow-hidden">
      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: col, opacity: 0.06 }} />
      <div className="flex justify-between items-start">
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${col}18`, border: `1px solid ${col}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={col} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: up ? '#22C55E' : '#EF4444' }}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="font-syne text-[26px] font-bold text-[#E0E6F4] tracking-tight">
          {value}
        </div>
        <div className="text-[13px] text-[#8B93A8] mt-1">{label}</div>
        {sub && <div className="text-[11.5px] text-[#4A5168] mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}
