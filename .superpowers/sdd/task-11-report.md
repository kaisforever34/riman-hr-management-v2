# Task 11 Report: Database indexes for hot query paths

**Status:** Complete
**Commit:** 4be787a — "perf: add indexes for leave, attendance, notification queries"

## Changes
- `prisma/schema.prisma`:
  - LeaveRequest: `@@index([employeeId, status])`, `@@index([status, startDate, endDate])`
  - AttendanceRecord: `@@index([date])` (skipped employeeId+date; covered by unique)
  - Notification: `@@index([userId, isRead])`
  - Payslip: `@@index([employeeId])`
- Migration `20260821081025_add_performance_indexes` created and applied to dev DB (localhost:5433).

## Verification
- `npx prisma migrate dev --name add_performance_indexes`: applied cleanly, client regenerated.
- `npx tsc --noEmit`: green.
- `npm run test` (vitest): 7 files / 75 tests passed.

## Concerns
- None. Indexes are non-concurrent creates but tables are small in dev; on production apply during low traffic if tables are large.
