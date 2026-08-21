# Working-Days & Holiday Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute leave duration in working days (per-employee weekly pattern + HR-managed public holidays) instead of calendar days.

**Architecture:** Pure-function engine (`src/lib/working-days.ts`) operating on `YYYY-MM-DD` date keys derived in UTC+4. `Employee.workWeek Int[]` stores each employee's working weekdays; a `Holiday` table stores HR-managed holiday dates. `submitLeave` consumes the engine; new manager pages manage holidays and the per-employee work week.

**Tech Stack:** Next.js 15 App Router, Prisma 5 + PostgreSQL, zod v4, Vitest, next-intl (en/ar).

**Spec:** `docs/superpowers/specs/2026-08-21-working-days-holidays-design.md`

## Global Constraints

- All existing tests keep passing (`npm run test`, currently 77+)
- `npm run verify` (lint && typecheck && test && build) green at end
- Dates compared as `YYYY-MM-DD` strings computed in UAE time (UTC+4)
- workWeek values are integers 0=Sunday … 6=Saturday; default `[0,1,2,3,4]`
- Existing stored leave requests are NOT recomputed — new requests only
- i18n: every user-facing string needs both en.json and ar.json entries
- Do not modify existing rows' `durationDays`

---

### Task 1: Engine module with TDD

**Files:**
- Create: `src/lib/working-days.ts`
- Test: `src/lib/__tests__/working-days.test.ts`

**Interfaces:**
- Produces (used by Tasks 2, 4, 6):
  - `toUaeDateKey(d: Date): string` — `'YYYY-MM-DD'` in UTC+4
  - `isWorkingDay(dateKey: string, workWeek: number[], holidays: Set<string>): boolean`
  - `countWorkingDays(startKey: string, endKey: string, workWeek: number[], holidays: Set<string>): number`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/__tests__/working-days.test.ts
import { describe, it, expect } from 'vitest'
import { toUaeDateKey, isWorkingDay, countWorkingDays } from '@/lib/working-days'

const SUN_THU = [0, 1, 2, 3, 4]
const MON_SAT = [1, 2, 3, 4, 5, 6]

describe('toUaeDateKey', () => {
  it('converts a UTC instant to the UAE (UTC+4) calendar day', () => {
    // 2026-01-01T20:00:00Z is 2026-01-02 00:00 in UAE
    expect(toUaeDateKey(new Date('2026-01-01T20:00:00Z'))).toBe('2026-01-02')
    expect(toUaeDateKey(new Date('2026-01-01T19:59:59Z'))).toBe('2026-01-01')
  })
})

describe('isWorkingDay', () => {
  it('returns true for a weekday in the pattern', () => {
    // 2026-01-04 is a Sunday
    expect(isWorkingDay('2026-01-04', SUN_THU, new Set())).toBe(true)
  })

  it('returns false for a weekend day', () => {
    // 2026-01-09 is a Friday, 2026-01-10 Saturday
    expect(isWorkingDay('2026-01-09', SUN_THU, new Set())).toBe(false)
    expect(isWorkingDay('2026-01-10', SUN_THU, new Set())).toBe(false)
  })

  it('respects custom patterns', () => {
    expect(isWorkingDay('2026-01-09', MON_SAT, new Set())).toBe(true)
    expect(isWorkingDay('2026-01-04', MON_SAT, new Set())).toBe(false)
  })

  it('returns false on a holiday even if it is a working weekday', () => {
    expect(isWorkingDay('2026-01-04', SUN_THU, new Set(['2026-01-04']))).toBe(false)
  })
})

describe('countWorkingDays', () => {
  it('counts inclusive range skipping weekends', () => {
    // Sun 2026-01-04 .. Sat 2026-01-10 → Sun,Mon,Tue,Wed,Thu = 5
    expect(countWorkingDays('2026-01-04', '2026-01-10', SUN_THU, new Set())).toBe(5)
  })

  it('excludes holidays inside the range', () => {
    const h = new Set(['2026-01-05']) // Monday
    expect(countWorkingDays('2026-01-04', '2026-01-06', SUN_THU, h)).toBe(2)
  })

  it('returns 0 when the whole range is non-working', () => {
    // Fri-Sat only
    expect(countWorkingDays('2026-01-09', '2026-01-10', SUN_THU, new Set())).toBe(0)
  })

  it('handles year boundary', () => {
    // Wed 2025-12-31 .. Fri 2026-01-02 → Wed(1) + Thu(1), Fri off = 2
    expect(countWorkingDays('2025-12-31', '2026-01-02', SUN_THU, new Set())).toBe(2)
  })

  it('single working day returns 1', () => {
    expect(countWorkingDays('2026-01-04', '2026-01-04', SUN_THU, new Set())).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/__tests__/working-days.test.ts` (bash timeout ≥120000ms)
Expected: FAIL — cannot resolve `@/lib/working-days`

- [ ] **Step 3: Implement**

```ts
// src/lib/working-days.ts
const UAE_OFFSET_MS = 4 * 60 * 60 * 1000

export function toUaeDateKey(d: Date): string {
  return new Date(d.getTime() + UAE_OFFSET_MS).toISOString().slice(0, 10)
}

function keyToUtcMidnight(key: string): number {
  return Date.parse(`${key}T00:00:00Z`)
}

export function isWorkingDay(dateKey: string, workWeek: number[], holidays: Set<string>): boolean {
  if (holidays.has(dateKey)) return false
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
  return workWeek.includes(day)
}

export function countWorkingDays(
  startKey: string,
  endKey: string,
  workWeek: number[],
  holidays: Set<string>,
): number {
  let count = 0
  const DAY_MS = 24 * 60 * 60 * 1000
  for (let t = keyToUtcMidnight(startKey); t <= keyToUtcMidnight(endKey); t += DAY_MS) {
    if (isWorkingDay(new Date(t).toISOString().slice(0, 10), workWeek, holidays)) count++
  }
  return count
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/__tests__/working-days.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/working-days.ts src/lib/__tests__/working-days.test.ts
git commit -m "feat: working-days engine with UAE timezone date keys"
```

---

### Task 2: Schema migration (workWeek + Holiday)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via CLI

**Interfaces:**
- Produces: `Employee.workWeek: number[]` (default `[0,1,2,3,4]`), `db.holiday` model with `findMany/findUnique/create/update/delete`.

- [ ] **Step 1: Edit schema**

In `model Employee`, add after `isActive Boolean @default(true)`:

```prisma
  workWeek              Int[]          @default([0, 1, 2, 3, 4])
```

Add new model after `LeaveType`:

```prisma
model Holiday {
  id        String   @id @default(cuid())
  name      String
  nameAr    String?
  date      DateTime @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Create and apply migration**

Run: `npx prisma migrate dev --name workweek_and_holidays` (timeout ≥180000ms)
Expected: migration applied cleanly to dev DB

- [ ] **Step 3: Regenerate client and typecheck**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add prisma
git commit -m "feat: add Employee.workWeek and Holiday table"
```

---

### Task 3: submitLeave uses working days

**Files:**
- Modify: `src/lib/validations/leave.ts`
- Modify: `src/lib/actions/leave.ts`
- Modify: `src/lib/errors.ts`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ar.json`
- Test: extend `src/lib/__tests__/leave.test.ts`

**Interfaces:**
- Consumes: `countWorkingDays`, `toUaeDateKey` from Task 1; `db.holiday` from Task 2.
- Produces: error keys `noWorkingDays`, `halfDayMustBeSingleDay`.

- [ ] **Step 1: Add validation rule + error keys**

In `src/lib/validations/leave.ts`, change `submitLeaveSchema` to:

```ts
export const submitLeaveSchema = z
  .object({
    leaveTypeId: z.string().min(1, 'Leave type is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isHalfDay: z.string().optional(),
    halfDayPeriod: z.string().optional(),
    reason: z.string().min(1, 'Reason is required'),
  })
  .refine(
    (d) => d.isHalfDay !== 'true' || d.startDate === d.endDate,
    { message: 'Half-day leave must start and end on the same day', path: ['endDate'] },
  )
```

In `src/lib/errors.ts` add to the `ErrorKey` union:

```ts
  | 'noWorkingDays'
  | 'halfDayMustBeSingleDay'
```

In `en.json` under `"errors"` add:
`"noWorkingDays": "The selected period contains no working days."`,
`"halfDayMustBeSingleDay": "Half-day leave must be within a single day."`

In `ar.json` under `"errors"` add:
`"noWorkingDays": "لا تحتوي الفترة المحددة على أيام عمل."`,
`"halfDayMustBeSingleDay": "يجب أن يكون الإجازة نصف اليوم داخل يوم واحد."`

- [ ] **Step 2: Update submitLeave action**

In `src/lib/actions/leave.ts`, replace the duration computation block (currently from `const start = new Date(data.startDate)` through the `durationExceeds365` check) with:

```ts
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const isHalfDay = data.isHalfDay === 'true'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (start < today) return { error: await serverError('startDatePast') }
  if (end < start) return { error: await serverError('endDateBeforeStart') }

  const holidays = await db.holiday.findMany({
    where: { date: { gte: start, lte: end } },
    select: { date: true },
  })
  const holidayKeys = new Set(holidays.map((h) => toUaeDateKey(h.date)))
  const durationDays = isHalfDay
    ? 0.5
    : countWorkingDays(toUaeDateKey(start), toUaeDateKey(end), employee.workWeek, holidayKeys)

  if (!isHalfDay && durationDays === 0) return { error: await serverError('noWorkingDays') }
  if (!isHalfDay && durationDays > 365) return { error: await serverError('durationExceeds365') }
```

Add import at top: `import { countWorkingDays, toUaeDateKey } from '@/lib/working-days'`

Note: `employee.workWeek` requires the employee query to select it — `db.employee.findUnique({ where: { userId } })` returns full record including scalars, so no change needed there.

- [ ] **Step 3: Extend action test**

Append to `describe('approveLeave')` sibling scope in `src/lib/__tests__/leave.test.ts` a new describe using the existing mock setup (mockDb already has all models; add `holiday: { findMany: vi.fn() }` to the mockDb object):

```ts
describe('submitLeave working days', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.user.role = 'EMPLOYEE'
    mockSession.user.id = 'u1'
  })

  it('rejects half-day spanning multiple days', async () => {
    mockDb.employee.findUnique.mockResolvedValueOnce({
      id: 'emp1', userId: 'u1', hireDate: new Date('2020-01-01'), workWeek: [0, 1, 2, 3, 4],
    })
    const form = makeFormData({
      leaveTypeId: 'lt1', startDate: '2026-09-01', endDate: '2026-09-05',
      isHalfDay: 'true', reason: 'x',
    })
    const result = await submitLeave(form)
    expect(result?.error).toBeDefined()
  })

  it('rejects when range has no working days', async () => {
    mockDb.employee.findUnique.mockResolvedValueOnce({
      id: 'emp1', userId: 'u1', hireDate: new Date('2020-01-01'), workWeek: [0, 1, 2, 3, 4],
    })
    mockDb.leaveType.findUnique.mockResolvedValue({ id: 'lt1', isActive: true, requiresAttachment: false })
    mockDb.holiday.findMany.mockResolvedValue([])
    // 2026-01-09 (Fri) .. 2026-01-10 (Sat) — non-working for Sun-Thu pattern
    const form = makeFormData({
      leaveTypeId: 'lt1', startDate: '2026-01-09', endDate: '2026-01-10', reason: 'x',
    })
    const result = await submitLeave(form)
    expect(result?.error).toContain('no working days')
  })
})
```

Also update the import line to include `submitLeave`: `import { approveLeave, cancelLeave, submitLeave } from '@/lib/actions/leave'`.
Note: existing tests that call `submitLeave` indirectly may need `mockDb.holiday.findMany` defaulting to `vi.fn().mockResolvedValue([])` — set that default in the mockDb declaration.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/leave.test.ts` (timeout ≥120000ms)
Expected: PASS (all, including new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/leave.ts src/lib/actions/leave.ts src/lib/errors.ts src/i18n/messages/en.json src/i18n/messages/ar.json src/lib/__tests__/leave.test.ts
git commit -m "feat: compute leave duration in working days"
```

---

### Task 4: Holiday admin (actions + page)

**Files:**
- Create: `src/lib/validations/holiday.ts`
- Create: `src/lib/actions/holiday.ts`
- Create: `src/lib/queries/holiday.ts`
- Create: `src/app/[locale]/(hr)/manager/holidays/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/holidays/holidays-client.tsx`
- Modify: `src/components/layout/sidebar.tsx` (nav item, manager section)
- Modify: `src/i18n/messages/en.json`, `ar.json` (nav label + page strings under a new `"holidays"` namespace)

**Interfaces:**
- Consumes: `db.holiday` (Task 2).
- Produces: actions `createHoliday(formData)`, `deleteHoliday(formData)`; query `getHolidays(): Promise<Holiday[]>` ordered by date asc.

- [ ] **Step 1: Validation schema**

```ts
// src/lib/validations/holiday.ts
import { z } from 'zod'

export const createHolidaySchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  nameAr: z.string().max(100).optional(),
  date: z.string().min(1, 'Required'),
})

export const deleteHolidaySchema = z.object({
  id: z.string().min(1),
})
```

- [ ] **Step 2: Query**

```ts
// src/lib/queries/holiday.ts
import { db } from '@/lib/db'
import type { Holiday } from '@prisma/client'

export async function getHolidays(): Promise<Holiday[]> {
  return db.holiday.findMany({ orderBy: { date: 'asc' } })
}
```

- [ ] **Step 3: Actions** (follow exact patterns of `src/lib/actions/employee.ts`: auth check → safeParse → db op → revalidatePath)

```ts
// src/lib/actions/holiday.ts
'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { createHolidaySchema, deleteHolidaySchema } from '@/lib/validations/holiday'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createHoliday(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const parsed = createHolidaySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: await serverError('validationFailed'), fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    await db.holiday.create({
      data: { name: parsed.data.name, nameAr: parsed.data.nameAr || null, date: new Date(parsed.data.date) },
    })
  } catch (e) {
    const isUnique = typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002'
    if (isUnique) return { error: await serverError('invalidRequest'), fieldErrors: {} }
    throw e
  }

  revalidatePath('/manager/holidays')
}

export async function deleteHoliday(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const parsed = deleteHolidaySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  await db.holiday.delete({ where: { id: parsed.data.id } })
  revalidatePath('/manager/holidays')
}
```

- [ ] **Step 4: Page + client component**

Page mirrors `src/app/[locale]/(hr)/manager/leave-types/page.tsx` structure exactly (auth guard MANAGER|HR_ADMIN redirect, `export const dynamic = 'force-dynamic'`, JSON-serialize props into client component):

```tsx
// src/app/[locale]/(hr)/manager/holidays/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getHolidays } from '@/lib/queries/holiday'
import HolidaysClient from './holidays-client'
export const dynamic = 'force-dynamic'

export default async function HolidaysPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN'))
    redirect(`/${locale}/auth/signin`)
  if (session.user.role !== 'HR_ADMIN') redirect(`/${locale}/dashboard`)

  const holidays = await getHolidays()
  return <HolidaysClient holidays={JSON.parse(JSON.stringify(holidays))} />
}
```

Client component: use existing shadcn ui components (`Card, CardHeader, CardTitle, CardContent, Input, Button, Table`) exactly as used in `leave-types-client.tsx`. Structure:
- Card "Add holiday" with form fields `name`, `nameAr`, `date` (type=date) calling `createHoliday` via a plain `<form action={createHoliday}>`; show `state?.error` via sonner toast or inline text following `leave-types-client.tsx` conventions.
- Table listing holidays (formatted date, name, nameAr, delete button in `<form action={deleteHoliday}>` with hidden `id` input).

i18n: read strings via `useTranslations('holidays')`; add namespace to both message files with keys: `title`, `addTitle`, `name`, `nameAr`, `date`, `add`, `delete`, `empty`.

- [ ] **Step 5: Sidebar nav**

In `src/components/layout/sidebar.tsx`, find the manager-only nav items array (where `/manager/leave-types` is defined) and add an entry `{ href: '/manager/holidays', labelKey: 'nav.holidays' }` matching the exact shape of neighboring entries. Add `nav.holidays` ("Holidays" / "العطلات الرسمية") to both message files.

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit && npm run lint && npm run test` (timeout ≥300000ms)
Expected: green

```bash
git add src/lib/validations/holiday.ts src/lib/actions/holiday.ts src/lib/queries/holiday.ts "src/app/[locale]/(hr)/manager/holidays" src/components/layout/sidebar.tsx src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: HR-managed public holiday admin page"
```

---

### Task 5: Employee work-week editor

**Files:**
- Modify: `src/app/[locale]/(hr)/employees/new/page.tsx` (or its client form component — locate the form rendering `employeeFormSchema` fields)
- Modify: `src/lib/validations/employee.ts`
- Modify: `src/lib/actions/employee.ts`
- Modify: `src/i18n/messages/en.json`, `ar.json`

**Interfaces:**
- Consumes: `Employee.workWeek` (Task 2).
- Produces: `workWeek` accepted by `createEmployee` (zod-coerced int array); new action `updateEmployeeWorkWeek(formData)`.

- [ ] **Step 1: Schema**

In `src/lib/validations/employee.ts`, add to `employeeFormSchema`:

```ts
  workWeek: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Select at least one day').default([0, 1, 2, 3, 4]),
```

Note: FormData sends repeated `workWeek` keys; in `createEmployee` build it before parsing:
`const raw = { ...Object.fromEntries(formData.entries()), workWeek: formData.getAll('workWeek') }`

- [ ] **Step 2: Action changes**

In `src/lib/actions/employee.ts` `createEmployee`, inside the `employee.create` data add:
`workWeek: data.workWeek,`

Add new action in the same file:

```ts
export async function updateEmployeeWorkWeek(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const employeeId = formData.get('employeeId') as string
  const days = formData.getAll('workWeek').map(Number)
  const parsed = z.array(z.number().int().min(0).max(6)).min(1).safeParse(days)
  if (!parsed.success || !employeeId) return { error: await serverError('invalidInput') }

  await db.employee.update({ where: { id: employeeId }, data: { workWeek: parsed.data } })
  revalidatePath('/employees')
}
```

(add `import { z } from 'zod'` at top of the file)

- [ ] **Step 3: Form UI**

In the new-employee form client component, add a fieldset of seven checkboxes labeled Sun–Sat (use existing i18n pattern; add `employees.workWeek` label key + `employees.days.sun`…`sat` keys to en/ar messages), all named `workWeek`, value `0`…`6`, Sun–Thu checked by default.

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit && npm run lint && npm run test` (timeout ≥300000ms)
Expected: green

```bash
git add src/lib/validations/employee.ts src/lib/actions/employee.ts "src/app/[locale]/(hr)/employees/new" src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: per-employee weekly work pattern on employee forms"
```

---

### Task 6: Calendar shading

**Files:**
- Modify: `src/app/[locale]/(hr)/manager/leaves/calendar/page.tsx`
- Modify: `src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx`

**Interfaces:**
- Consumes: `getHolidays()` (Task 4), `isWorkingDay`, `toUaeDateKey` (Task 1).

- [ ] **Step 1: Page passes data**

In `calendar/page.tsx`, fetch holidays alongside existing queries and pass down:
`const holidays = await getHolidays()` then prop `holidayKeys={JSON.parse(JSON.stringify(holidays.map((h) => h.date.toISOString())))}`.
Simpler and safer: pass raw dates and convert in client with `toUaeDateKey(new Date(h.date))` — pass `holidays={JSON.parse(JSON.stringify(holidays))}`.

- [ ] **Step 2: Client shades cells**

In `calendar-client.tsx`:
- Build `const holidaySet = new Set(holidays.map((h) => toUaeDateKey(new Date(h.date))))`.
- For each rendered day cell, determine its date key and apply a muted/grey class when `!isWorkingDay(key, workWeekOfCellContext, holidaySet)`. The calendar renders leave entries per employee — if employees' `workWeek` is available in existing props use it; otherwise pass `workWeek` per employee from the page query (add `workWeek: true` to the employee select in the page's query if it selects specific fields).
- Non-working cells get `className="... opacity-40 bg-muted"` merged with existing cell classes (match file's class style).

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npm run lint` 
Expected: green

```bash
git add "src/app/[locale]/(hr)/manager/leaves/calendar"
git commit -m "feat: shade non-working days and holidays on leave calendar"
```

---

### Task 7: Full verification

- [ ] Run `npm run verify` (lint && typecheck && test && build), timeout ≥600000ms. All must pass.
- [ ] Manual smoke (dev server): submit a leave request spanning a Friday with Sun–Thu employee → duration excludes Friday; add a holiday via /manager/holidays inside a range → resubmission excludes it.

## Self-Review

- **Spec coverage:** engine (Task 1) ✓, schema (Task 2) ✓, submitLeave integration + half-day validation + error keys (Task 3) ✓, holiday admin UI (Task 4) ✓, work-week editor (Task 5) ✓, calendar shading (Task 6) ✓, verification (Task 7) ✓. Out-of-scope items respected.
- **Placeholders:** Task 4 Step 4 and Task 5 Step 3 reference existing component conventions with concrete structure described — acceptable as they mandate mirroring named files; all logic code is verbatim.
- **Type consistency:** `toUaeDateKey/isWorkingDay/countWorkingDays` signatures consistent across Tasks 1/3/6; `getHolidays` consistent between 4 and 6; error keys match union additions.
