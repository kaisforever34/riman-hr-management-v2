import { TrendingUp, TrendingDown } from 'lucide-react'

const AV_COLS = ['#D4A843', '#0FC8BA', '#8B5CF6', '#4B8BF0', '#EF4444', '#22C55E', '#F59E0B', '#EC4899']

function avCol(ini: string) {
  return AV_COLS[ini.charCodeAt(0) % AV_COLS.length]
}

export function Avatar({ ini, sz = 32 }: { ini: string; sz?: number }) {
  const color = avCol(ini)
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0 font-syne font-bold"
      style={{
        width: sz,
        height: sz,
        background: `${color}22`,
        border: `1.5px solid ${color}55`,
        fontSize: sz * 0.33,
        color,
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
    default: 'bg-white/5 text-ledger-text-secondary border border-border',
    secondary: 'bg-upper-stratum text-ledger-text border border-border',
    gold: 'bg-gold/10 text-gold border border-gold/20',
    green: 'bg-statement-green/10 text-statement-green border border-statement-green/20',
    red: 'bg-audit-red/10 text-audit-red border border-audit-red/15',
    blue: 'bg-inquiry-blue/10 text-inquiry-blue border border-inquiry-blue/20',
    teal: 'bg-statement-teal/10 text-statement-teal border border-statement-teal/20',
    amber: 'bg-warning-amber/10 text-warning-amber border border-warning-amber/20',
    purple: 'bg-authority-purple/10 text-authority-purple border border-authority-purple/20',
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
    <div className="rounded-xl bg-card border border-border p-5 relative overflow-hidden group">
      {/* Subtle ambient glow */}
      <div
        className="absolute -top-8 -end-8 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.1]"
        style={{ background: col }}
      />
      <div className="flex justify-between items-start">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center"
          style={{ background: `${col}18`, border: `1px solid ${col}30` }}
        >
          <Icon size={18} color={col} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[12px] font-semibold ${up ? 'text-statement-green' : 'text-audit-red'}`}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="font-syne text-[26px] font-bold text-ledger-text tracking-tight">
          {value}
        </div>
        <div className="text-[13px] text-ledger-text-secondary mt-1">{label}</div>
        {sub && <div className="text-[11.5px] text-ledger-text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}
