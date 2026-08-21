# Task 6 Report: Calendar shading

**Status:** Complete
**Commit:** aeeb69d — feat: shade non-working days and holidays on leave calendar

## Changes
- `page.tsx`: added `getHolidays()` fetch; added `workWeek: true` to employee select; passes `holidays` (JSON-serialized) to `CalendarClient`.
- `calendar-client.tsx`: builds `holidaySet` via `toUaeDateKey(new Date(h.date))`; each day cell computes its date key and is shaded `opacity-40 bg-muted` when non-working.

## Work-week logic
Cells are per-day (not per-employee), so shading uses the work weeks of employees relevant to the cell: employees with leave that day if any, otherwise all employees with requests. A cell is greyed only if the day is non-working for **all** relevant work weeks. Holidays grey the cell regardless of work week (via `isWorkingDay`).

## Verification
- `npx tsc --noEmit` — green
- `npm run lint` — green
- `npm run test` — 8 files, 89 tests passed

## Concerns
- Days with no leave requests use all requests' work weeks as the shading context; if the org has mixed work weeks, a day could be a working day for one employee and not another — greyed only when non-working for everyone (conservative).
- `dayNames`/`monthNames` remain hardcoded English (pre-existing).
