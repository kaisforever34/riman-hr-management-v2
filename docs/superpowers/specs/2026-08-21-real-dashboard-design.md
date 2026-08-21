# Real Dashboard Data — Design

Date: 2026-08-21
Status: Approved

## Problem

`src/components/dashboard/content.tsx` renders hardcoded mock datasets (PAYROLL_TREND, ATT_WEEK, LEAVE_DIST) and a fake payroll KPI (`totalEmployees * 5000`). Executives see numbers that mean nothing.

## Decisions

- All data computed server-side in a new `src/lib/queries/dashboard.ts`; passed as props to `DashboardContent` (already a client component receiving props).
- Empty datasets render honest empty states ("no data yet") — never zeros pretending to be data.

## Queries

1. **getPayrollTrend()**: last ≤6 PayrollPeriods (any status) with `SUM(Payslip.netPay)` per period → `{ monthKey: 'YYYY-MM', label via existing months i18n, total }[]`. Fewer points than 6 is fine.
2. **getWeeklyAttendance()**: AttendanceRecords where `date` within current week's working days (Sun–Thu, computed in UAE time using existing working-days helpers) grouped by date → `{ day: 'SUN'|'MON'..., present, late, absent }[]`. ABSENT = days with no record for that employee? NO — keep simple: counts by status of records only (PRESENT/LATE/HALF_DAY→present-ish, ABSENT). Per-day absent = active employees minus (present+late) for that day, floored at 0.
3. **getLeaveDistribution(year)**: approved LeaveRequests in calendar year joined to leaveType, sum durationDays by type name; top 5 by value + "Other" bucket; percentages computed client-side.
4. **getPayrollKpi()**: if a PayrollPeriod exists for current month/year → SUM(netPay) of its payslips; else SUM(salary) of active employees.

## Component Changes

- `DashboardContent` props become `{ payrollTrend, weeklyAttendance, leaveDistribution, payrollKpi: { total, source: 'period' | 'salaries' }, totalEmployees, presentCount, pendingLeaves }`.
- Charts render props; month/day labels reuse existing `months.*`/`days.*` i18n keys; series names unchanged.
- Empty states: when arrays empty, show centered muted text (i18n keys `dashboard.noData`, plus `dashboard.payrollNoPeriods` note under KPI when source === 'salaries').

## Page Wiring

`src/app/[locale]/(hr)/dashboard/page.tsx`: fetch all dashboard queries alongside existing counters (`Promise.all`), pass down.

## Testing

- Unit tests for each query function with mocked db (groupBy/findMany shapes as used).
- Existing tests untouched; `npm run verify` green.

## Out of Scope

- Date-range pickers, drill-downs, manager-scoped dashboards.
