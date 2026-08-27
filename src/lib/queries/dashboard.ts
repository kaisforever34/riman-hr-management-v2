import { db } from '@/lib/db'
import { UAE_OFFSET_MS } from '@/lib/working-days'

export async function getPayrollTrend(): Promise<
  { monthKey: string; total: number }[]
> {
  const periods = await db.payrollPeriod.findMany({
    include: { payslips: { select: { netPay: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 6,
  })

  return periods
    .slice(0, 6)
    .map((p: { year: number; month: number; payslips: { netPay: unknown }[] }) => ({
      monthKey: `${p.year}-${String(p.month).padStart(2, '0')}`,
      total: p.payslips.reduce(
        (sum, s) => sum + Number(s.netPay ?? 0),
        0
      ),
    }))
    .sort((a: { monthKey: string }, b: { monthKey: string }) =>
      a.monthKey.localeCompare(b.monthKey)
    )
}

export async function getWeeklyAttendance(
  activeEmployees: number
): Promise<{ dayIndex: number; present: number; late: number; absent: number }[]> {
  const now = new Date(Date.now() + UAE_OFFSET_MS)
  const weekStart = new Date(now)
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
  weekStart.setUTCHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4)
  weekEnd.setUTCHours(23, 59, 59, 999)

  const records = await db.attendanceRecord.findMany({
    where: { date: { gte: weekStart, lte: weekEnd } },
    select: { date: true, status: true },
  })

  const buckets = [0, 1, 2, 3, 4].map((dayIndex) => ({ dayIndex, present: 0, late: 0 }))

  for (const r of records) {
    const d = new Date(r.date)
    const idx = d.getUTCDay()
    if (idx > 4) continue
    if (r.status === 'PRESENT' || r.status === 'HALF_DAY') buckets[idx].present++
    else if (r.status === 'LATE') buckets[idx].late++
  }

  return buckets.map((b) => ({
    ...b,
    absent: Math.max(0, activeEmployees - b.present - b.late),
  }))
}

export async function getLeaveDistribution(
  year: number
): Promise<{ name: string; value: number }[]> {
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))

  const [grouped, leaveTypes] = await Promise.all([
    db.leaveRequest.groupBy({
      by: ['leaveTypeId'],
      where: {
        status: 'APPROVED',
        startDate: { gte: yearStart, lte: yearEnd },
      },
      _sum: { durationDays: true },
    }),
    db.leaveType.findMany({ select: { id: true, name: true } }),
  ])

  if (grouped.length === 0) return []

  const nameById = new Map(leaveTypes.map((t: { id: string; name: string }) => [t.id, t.name]))

  const entries = grouped
    .map((g: { leaveTypeId: string; _sum: { durationDays: unknown } }) => ({
      name: nameById.get(g.leaveTypeId) ?? 'Other',
      value: Math.round(Number(g._sum.durationDays ?? 0)),
    }))
    .sort((a: { value: number }, b: { value: number }) => b.value - a.value)

  const top = entries.slice(0, 5)
  const otherValue = entries
    .slice(5)
    .reduce((sum: number, e: { value: number }) => sum + e.value, 0)

  if (otherValue > 0) top.push({ name: 'Other', value: otherValue })
  return top
}

export async function getPayrollKpi(): Promise<{
  total: number
  source: 'period' | 'salaries'
}> {
  const now = new Date(Date.now() + UAE_OFFSET_MS)
  const month = now.getUTCMonth() + 1
  const year = now.getUTCFullYear()

  const period = await db.payrollPeriod.findUnique({
    where: { month_year: { year, month } },
    include: { payslips: { select: { netPay: true } } },
  })

  if (period) {
    const total = period.payslips.reduce((sum: number, s: { netPay: unknown }) => sum + Number(s.netPay ?? 0), 0)
    return { total, source: 'period' }
  }

  const salaries = await db.employee.aggregate({
    where: { isActive: true },
    _sum: { salary: true },
  })

  return { total: Number(salaries._sum.salary ?? 0), source: 'salaries' }
}

/** Count active employees — used by dashboard and other pages. */
export async function getActiveEmployeeCount(): Promise<number> {
  return db.employee.count({ where: { user: { isActive: true } } })
}

/** Count pending leave requests — used by dashboard. */
export async function getPendingLeaveCount(): Promise<number> {
  return db.leaveRequest.count({ where: { status: 'PENDING' } })
}

/** Count today's present employees (has checkIn) — used by dashboard. */
export async function getTodayPresentCount(today: Date): Promise<number> {
  return db.attendanceRecord.count({
    where: { date: today, checkIn: { not: null } },
  })
}
