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


