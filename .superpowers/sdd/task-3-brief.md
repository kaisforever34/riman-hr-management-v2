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


