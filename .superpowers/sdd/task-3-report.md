# Task 3 Report: submitLeave uses working days

**Status**: Complete
**Commit**: 143add8 — "feat: compute leave duration in working days"

## Changes
- `src/lib/validations/leave.ts`: submitLeaveSchema now a chained `.refine` rejecting half-day leaves where startDate !== endDate.
- `src/lib/errors.ts`: added `noWorkingDays`, `halfDayMustBeSingleDay` to ErrorKey union.
- `src/i18n/messages/en.json` / `ar.json`: added both error messages.
- `src/lib/actions/leave.ts`: replaced calendar-day duration computation with holiday lookup (`db.holiday.findMany`) + `countWorkingDays` using `employee.workWeek`; added `noWorkingDays` rejection.
- `src/lib/__tests__/leave.test.ts`: added `holiday: { findMany: vi.fn().mockResolvedValue([]) }` to mockDb and new `submitLeave working days` describe with 2 tests.

## Test adjustments vs brief
- Test 2 form data needed explicit `isHalfDay: 'false', halfDayPeriod: ''` — `formData.get` returns `null` for unset fields and zod `.optional()` rejects null, causing a spurious validation failure.
- Brief's dates (2026-01-09/10) are in the past relative to today (2026-08-21), tripping the `startDatePast` check; replaced with future Fri/Sat pair 2026-09-04/05.

## Verification
- `npx vitest run leave.test.ts validations.test.ts`: 51 passed
- `npm run test`: 8 files, 89 passed
- `npx tsc --noEmit`: clean
