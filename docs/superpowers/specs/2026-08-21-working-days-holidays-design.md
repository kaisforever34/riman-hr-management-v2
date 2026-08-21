# Working-Days & Holiday Engine — Design

Date: 2026-08-21
Status: Approved (pending final spec review)

## Problem

Leave duration is computed as calendar days (`floor(diff) + 1`), counting Fridays/Saturdays and public holidays as leave. UAE weekend policy and movable public holidays make this wrong; employees lose balance for days they don't work, generating disputes. Attendance also has no holiday awareness.

## Decisions (from brainstorming)

- Weekend **varies per employee** → per-employee weekly working-day pattern.
- Pattern model: simple **weekly pattern per employee** (not shift rosters, not attendance-derived).
- Holidays: **HR-managed holiday table** in-app (UAE decree dates arrive mid-year; manual entry is realistic). No pre-seeded estimates.
- Existing requests: **new requests only** use the new calculation; stored `durationDays` values are untouched.

## Schema Changes

```prisma
model Employee {
  // existing fields...
  workWeek Int[] @default([0, 1, 2, 3, 4]) // working weekdays, 0=Sun .. 6=Sat
}

model Holiday {
  id        String   @id @default(cuid())
  name      String
  nameAr    String?
  date      DateTime @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

One migration. No backfill of holidays. Default work week Sun–Thu (current UAE private-sector standard); HR can change per employee.

## Engine

New file `src/lib/working-days.ts`:

```ts
// dateKey: 'YYYY-MM-DD' in UAE time (UTC+4)
export function toUaeDateKey(d: Date): string
export function isWorkingDay(dateKey: string, workWeek: number[], holidays: Set<string>): boolean
export function countWorkingDays(startKey: string, endKey: string, workWeek: number[], holidays: Set<string>): number
```

- Pure functions; all comparisons on `YYYY-MM-DD` strings derived in UTC+4 so server timezone cannot skew results.
- Inclusive of both start and end.
- Half-day rule enforced at validation layer, not in engine.

## Integration

### submitLeave (`src/lib/actions/leave.ts`)
1. Load employee `workWeek` (already fetched employee record) + `Holiday` rows where `date` between start and end (single query, mapped to a Set of date keys).
2. `durationDays = countWorkingDays(startKey, endKey, workWeek, holidaySet)`.
3. If `durationDays === 0` → error `noWorkingDays`.
4. Validation additions to `submitLeaveSchema`: when `isHalfDay === 'true'`, require `startDate === endDate`.
5. Overlap check, balance math, notifications unchanged (all already consume `durationDays`).

### Holiday admin UI
New manager page `/manager/holidays` (HR_ADMIN only, mirroring `/manager/leave-types` patterns): year-grouped list, add form (name, nameAr optional, date), edit inline, delete with confirm. Server actions in `src/lib/actions/holiday.ts` with zod schema in `src/lib/validations/holiday.ts`.

### Employee work-week editor
Seven-checkbox multi-select added to the new-employee form (`/employees/new`) and a new `updateEmployeeWorkWeek` action for edits from the employee detail context. Default checked: Sun–Thu.

### Calendar shading
`/manager/leaves/calendar` fetches holidays for the visible month range and greys non-working day cells using `isWorkingDay` (shared import, client-safe pure module).

## Error Handling

New i18n keys under `errors`: `noWorkingDays`, `halfDayMustBeSingleDay`. Added to `ErrorKey` union in `src/lib/errors.ts` and both en.json/ar.json.

## Testing

- `src/lib/__tests__/working-days.test.ts`: weekend spans (Fri/Sat pattern), custom patterns (e.g., Mon–Sat), holidays inside/outside range, year boundary, single non-working day → 0, full week, inclusive ends, UTC+4 key stability.
- Action test: `submitLeave` computes working-day duration (mock db per existing test patterns).
- Migration applied to dev DB; `npm run verify` green.

## Out of Scope

- Recomputing historical request durations/balances.
- Shift rosters, attendance auto-marking holidays as non-working (attendance page may shade later).
- Email notifications, pagination (separate backlog items).
