# Real Dashboard Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded dashboard datasets with live database aggregations.

**Architecture:** New server-side query module `src/lib/queries/dashboard.ts` computes payroll trend, weekly attendance, leave distribution, and payroll KPI; the dashboard page fetches them in parallel and passes them as props to `DashboardContent`, which renders honest empty states when data is missing.

**Tech Stack:** Prisma 5 aggregations, Recharts (existing), next-intl keys already present.

**Spec:** `docs/superpowers/specs/2026-08-21-real-dashboard-design.md`

## Global Constraints

- `npm run verify` green; existing tests untouched
- No fake numbers anywhere on the dashboard
- i18n en/ar parity maintained
- UAE-time week boundaries via existing date helpers where applicable

---

### Task 1: Dashboard query module with TDD

**Files:**
- Create: `src/lib/queries/dashboard.ts`
- Test: `src/lib/__tests__/dashboard-queries.test.ts`

**Interfaces:**
- Produces:
  - `getPayrollTrend(): Promise<{ monthKey: string; total: number }[]>` — monthKey 'YYYY-MM', ascending, ≤6 entries
  - `getWeeklyAttendance(activeEmployees: number): Promise<{ day: string; present: number; late: number; absent: number }[]>` — day ∈ SUN..THU (UAE current week)
  - `getLeaveDistribution(year: number): Promise<{ name: string; value: number }[]>` — top 5 + Other, by summed durationDays of APPROVED requests
  - `getPayrollKpi(): Promise<{ total: number; source: 'period' | 'salaries' }>`

- [ ] **Step 1: Write failing tests**

Mock `@/lib/db` with the shapes used. Cover:
- getPayrollTrend groups payslips per period and sorts ascending by monthKey; caps at last 6 periods; returns [] when no periods
- getWeeklyAttendance counts PRESENT/LATE records per day and derives absent = max(0, activeEmployees - present - late); returns 5 entries SUN..THU
- getLeaveDistribution sums durationDays by type name, sorts desc, keeps top 5 and lumps rest into 'Other'; empty input → []
- getPayrollKpi returns source 'period' with payslip sum when current-month period exists, else source 'salaries' with active salary sum

Use `vi.mock('@/lib/db')` with mock findMany/groupBy/aggregate implementations; construct db shapes:
```ts
// payroll trend implementation shape (hint for mocking):
// db.payrollPeriod.findMany({ include: { payslips: { select: { netPay: true } } }, orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 6 })
// weekly attendance:
// db.attendanceRecord.findMany({ where: { date: { gte: weekStart, lte: weekEnd } }, select: { date: true, status: true } })
// leave distribution:
// db.leaveRequest.groupBy({ by: ['leaveTypeId'], where: { status: 'APPROVED', startDate: { gte: yearStart, lte: yearEnd } }, _sum: { durationDays: true } }) + db.leaveType.findMany({ select: { id: true, name: true } })
// payroll kpi:
// db.payrollPeriod.findFirst({ where: { month, year } }) → db.payslip.aggregate({ _sum: { netPay: true } })
//   else db.employee.aggregate({ _sum: { salary: true }, where: { isActive: true } })
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/__tests__/dashboard-queries.test.ts` (timeout ≥180000ms)
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/queries/dashboard.ts`**

Implementation notes:
- Week start/end: compute from `new Date()` shifted +4h (UAE) → find Sunday of current week 00:00 UTC-equivalent; end = Thursday 23:59. Day labels derived from actual dates mapped to 'SUN'...'THU'.
- monthKey = `${year}-${String(month).padStart(2, '0')}`
- Leave distribution: groupBy leaveTypeId with `_sum.durationDays`; map names via leaveType lookup; values rounded to nearest int; 'Other' aggregates remainder beyond top 5.
- All functions defensive: wrap aggregate results with `Number(x ?? 0)`.

- [ ] **Step 4: Run to verify pass**, then full suite `npm run test` (timeout ≥300000ms)

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/dashboard.ts src/lib/__tests__/dashboard-queries.test.ts
git commit -m "feat: live dashboard aggregation queries"
```

---

### Task 2: Wire page + rewire component

**Files:**
- Modify: `src/app/[locale]/(hr)/dashboard/page.tsx`
- Modify: `src/components/dashboard/content.tsx`

- [ ] **Step 1: Page** — read it first; add to its existing `Promise.all`: `getPayrollTrend()`, `getWeeklyAttendance(totalEmployees)`, `getLeaveDistribution(new Date().getFullYear())`, `getPayrollKpi()`. Pass all as props (JSON-safe: they're plain numbers/strings).

- [ ] **Step 2: Component** — delete `PAYROLL_TREND`, `ATT_WEEK`, `LEAVE_DIST` constants. New props signature:

```ts
export default function DashboardContent({
  totalEmployees, presentCount, pendingLeaves,
  payrollTrend, weeklyAttendance, leaveDistribution, payrollKpi,
}: {
  totalEmployees: number
  presentCount: number
  pendingLeaves: number
  payrollTrend: { monthKey: string; total: number }[]
  weeklyAttendance: { day: string; present: number; late: number; absent: number }[]
  leaveDistribution: { name: string; value: number }[]
  payrollKpi: { total: number; source: 'period' | 'salaries' }
})
```

- Payroll KPI card: value `AED ${payrollKpi.total.toLocaleString()}`; sub shows existing `t('kpiPayrollSub')` plus, when `source === 'salaries'`, append ` · ${t('payrollEstimateNote')}` (new key).
- Payroll trend chart: XAxis `dataKey="monthKey"` (drop the months tickFormatter OR map monthKey→month name via `t('months.' + monthKey.slice(0,3))`— simplest: format label as monthKey directly). When `payrollTrend.length === 0` render `<div className="py-12 text-center text-[13px] text-[#8B93A8]">{t('noData')}</div>` instead of chart.
- Weekly attendance: use prop array; same rendering.
- Leave distribution: colors cycle through existing C.* palette by index; legend uses `t(`leaveTypes.${d.name}`)` — NOTE: dynamic type names may miss i18n keys; fall back: `{t(`leaveTypes.${d.name}`)}` only if the name matches known enum, else render raw `d.name`. Implement helper `const ltLabel = (name: string) => ['Annual','Sick','Personal','Maternity','Paternity','Hajj/Umrah','Compassionate','Unpaid','Other'].includes(name) ? t(`leaveTypes.${name === 'Hajj/Umrah' ? 'HajjUmrah' : name}`) : name` — CHECK en.json `dashboard.leaveTypes` keys first and align exactly.
- Add i18n keys to en/ar: `dashboard.noData` ("No data yet" / "لا توجد بيانات بعد"), `dashboard.payrollEstimateNote` ("estimated from salaries" / "تقدير مبني على الرواتب").

- [ ] **Step 3: Verify**: `npx tsc --noEmit && npm run lint && npm run test` (timeout ≥300000ms)

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(hr)/dashboard" src/components/dashboard/content.tsx src/i18n/messages
git commit -m "feat: render dashboard charts from live data"
```

---

### Task 3: Verification

- [ ] `npm run verify` (timeout ≥600000ms)
- [ ] Manual smoke against dev DB: login as admin → dashboard shows real totals matching seeded data; charts show seeded payroll periods if any exist, else honest empty states.

## Self-Review

- Spec coverage: 4 queries (Task 1) ✓ page wiring + component + empty states + i18n (Task 2) ✓ verification (Task 3) ✓
- Placeholders: Task 2 leaves a check-alignment instruction for i18n key names — bounded by explicit fallback logic, acceptable.
- Type consistency: prop names match between Tasks 1–2 signatures.
