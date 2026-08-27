# HR System — Core Business Logic Audit Report

**Date:** 2026-08-27
**Scope:** Payroll, Leave, EOSB, Attendance, Timezone, Data Integrity
**Test Suite:** 213 tests passing (13 new regression tests added in `audit-bugs.test.ts`)

---

## Executive Summary

**7 Critical/High bugs found that cause wrong pay, wrong leave balances, or wrong compliance data.**
**5 Medium bugs found that cause data inconsistency or silent failures.**
**4 Low bugs found that are precision or edge-case issues.**

The most urgent fixes are:
1. **Overtime overpayment by 5x** (`payroll.ts:16`)
2. **EOSB cap wrong per UAE law** (`eosb.ts:37`)
3. **Negative EOSB payout possible** (`eosb.ts:37`)
4. **Leave balance double-allocation for Feb 29 hires** (`queries/leave.ts:65`)
5. **Annual leave day under/over-count in payroll** (`payroll.ts:71-73`)

---

## Section 1: Payroll Calculation Bugs

### BUG-01 [CRITICAL] Overtime paid at 125% instead of 25% premium
- **File:** `src/lib/actions/payroll.ts:16,155`
- **Code:** `const OT_PREMIUM_RATE = 1.25; const pay = hours * hourlyRate * OT_PREMIUM_RATE`
- **Trigger:** Any approved overtime record
- **What happens:** Employee with basicSalary=5000, 60 min OT → paid 23.15 AED
- **What should happen:** Overtime premium should be 25% of hourly rate (1.25x total, but employee is already salaried), so 4.63 AED
- **Overpayment:** 18.52 AED per hour (400% too high)
- **Severity:** CRITICAL — Wrong Pay. Affects every employee with overtime.
- **Fix:** Change `OT_PREMIUM_RATE` to `0.25` if paying premium on top of salary. If the business intentionally pays 125% of hourly rate (full rate, not premium), rename the constant to `OT_RATE` and document the policy. Also fix `getOvertimePayrollData` at line 454 which uses the same rate.

### BUG-02 [HIGH] Annual leave days computed with calendar days, not working days
- **File:** `src/lib/actions/payroll.ts:71-73`
- **Code:**
  ```ts
  const requestDays = Math.floor((req.endDate.getTime() - req.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const overlap = overlapDays(req.startDate, req.endDate, periodStart, periodEnd)
  entry.annualLeaveDays += (req.durationDays / requestDays) * overlap
  ```
- **Trigger:** Leave request spanning a weekend with partial period overlap
- **Example:** Leave Thu Aug 6 – Mon Aug 10 (5 calendar days, 3 working for Sun-Thu). Payroll period Fri Aug 7 – Sun Aug 9 (3 calendar days). Buggy: round((3/5)*3) = 2. Correct: countWorkingDays(Aug 7–9, Sun-Thu) = 1 (only Sunday).
- **What happens:** Annual leave days are overcounted by up to ~50% when leave spans weekends and the period overlap doesn't align with the working-day distribution.
- **Impact:** Transportation deduction (`transportationAmount / 30 * annualLeaveDays`) is wrong.
- **Severity:** HIGH — Wrong Pay. Affects transportation deduction for every employee with annual leave.
- **Fix:** Replace the calendar-day interpolation with working-day counting. Fetch each employee's `workWeek` and period holidays, then use `countWorkingDays()` on the overlap range.

### BUG-03 [MEDIUM] Payroll period excludes last day when server is UTC+4
- **File:** `src/lib/actions/payroll.ts:245-246, 284-285, 435-436`
- **Code:** `const periodStart = startOfMonth(new Date(year, month - 1)); const periodEnd = endOfMonth(periodStart)`
- **Trigger:** Server deployed in UTC+4 timezone (UAE)
- **What happens:** `new Date(2026, 0)` in UTC+4 = Dec 31, 2025 20:00 UTC. `endOfMonth` = Jan 30, 2025 20:00 UTC. Query `date <= periodEnd` excludes Jan 31 records (which are at Jan 31 00:00 UTC).
- **Impact:** Last day of every month is excluded from absence counts, late deductions, and overtime calculations.
- **Severity:** MEDIUM — Wrong Pay. Systematically misses one day per month.
- **Fix:** Use UTC-aware date construction:
  ```ts
  const periodStart = startOfMonth(new Date(Date.UTC(year, month - 1)))
  const periodEnd = endOfMonth(periodStart)
  ```
  Apply the same fix to `recalculatePayslips` (line 284-285) and `getOvertimePayrollData` (line 435-436).

### BUG-04 [LOW] Late deduction float accumulation
- **File:** `src/lib/actions/payroll.ts:116-127`
- **Trigger:** Employee with 10+ small late deductions
- **What happens:** Sum of rounded-per-record deductions can differ by 1 cent from rounded-total
- **Example:** basicSalary=5000, 10 records of 1 minute late: accumulated=3.09, per-record=3.10
- **Severity:** LOW — 1 cent discrepancy
- **Fix:** Apply `round2()` to each individual deduction before accumulating.

### BUG-05 [LOW] totalGross has no rounding
- **File:** `src/lib/actions/payroll.ts:195`
- **Code:** `const totalGross = basicSalary + housingAllowance + transportAllowance + otherAllowances`
- **Severity:** LOW — potential float precision issue
- **Fix:** `const totalGross = round2(basicSalary + housingAllowance + transportAllowance + otherAllowances)`

### BUG-06 [LOW] finalizePayroll has no validation
- **File:** `src/lib/actions/payroll.ts:404-428`
- **Trigger:** Payroll period with zero/negative netPay payslips
- **What happens:** Finalizes without checking if payslips are valid
- **Severity:** LOW — no guardrails
- **Fix:** Add validation: check all payslips have netPay > 0 and totalGross > 0 before allowing finalization.

---

## Section 2: Leave Balance Bugs

### BUG-07 [CRITICAL] Leap year Feb 29 hire causes double leave balance allocation
- **File:** `src/lib/queries/leave.ts:65`
- **Code:** `const yearStart = new Date(Date.UTC(year, hireDate.getUTCMonth(), hireDate.getUTCDate()))`
- **Trigger:** Employee hired on Feb 29 in a leap year (e.g., 2024-02-29)
- **What happens:** In non-leap year 2025, `Date.UTC(2025, 1, 29)` overflows to `2025-03-01`. The period start becomes March 1 instead of Feb 29. A new `LeaveBalance` row is created for the wrong period.
- **Impact:** Employee gets a second full allocation of leave days. The old balance row is orphaned. Leave requests in the correct period may not find the balance.
- **Confirmed by test:** `audit-bugs.test.ts` — `getPeriodStartForDate` returns `2024-03-01` instead of `2024-02-29` for a Feb 29 hire in 2025.
- **Severity:** CRITICAL — Wrong Leave Balance. Double allocation of leave days.
- **Fix:** Normalize Feb 29 hires:
  ```ts
  const yearStart = new Date(Date.UTC(year, hireDate.getUTCMonth(), hireDate.getUTCDate()))
  if (yearStart.getUTCDate() !== hireDate.getUTCDate()) {
    yearStart.setUTCDate(1)
    yearStart.setUTCMonth(yearStart.getUTCMonth() - 1)
  }
  ```

### BUG-08 [CRITICAL] carriedOver stored as Int truncates half-day carryover
- **File:** `prisma/schema.prisma:118` + `src/lib/actions/leave.ts:56`
- **Schema:** `carriedOver Int @default(0)`
- **Trigger:** Employee with half-day leave in previous year (e.g., used 1.5 days out of 30)
- **What happens:** `unused = 30 + 0 - 1.5 = 28.5`. `carryover = min(28.5, 15) = 15`. No issue when capped. But if maxCarryover > unused, e.g., unused=28.5 and maxCarryover=30, carryover=28.5 is stored as Int → truncated to 28.
- **Impact:** Employee loses 0.5 day of carryover each year. Compounds over time.
- **Severity:** CRITICAL — Wrong Leave Balance. Systematic loss of leave entitlements.
- **Fix:** Change `carriedOver` in schema from `Int` to `Float`.

### BUG-09 [HIGH] Carryover update outside transaction
- **File:** `src/lib/actions/leave.ts:151-158`
- **Code:** Leave request is created (committed), then carryover is calculated and updated separately
- **Trigger:** DB error between leave creation and carryover update
- **What happens:** Leave request exists but carryover is not applied. Next submit recalculates but may not catch up.
- **Severity:** HIGH — Wrong Leave Balance
- **Fix:** Wrap leave creation + carryover update in a single `db.$transaction`. Apply same fix to `submitLeaveForEmployee` (lines 532-539).

### BUG-10 [HIGH] updateLeave silently skips balance decrement when old balance not found
- **File:** `src/lib/actions/leave.ts:628-641`
- **Code:**
  ```ts
  const oldBalance = await tx.leaveBalance.findFirst({ ... })
  if (oldBalance) {
    await tx.leaveBalance.update({ ... decrement ... })
  }
  ```
- **Trigger:** Approved leave request exists but its balance record was deleted or never created
- **What happens:** Request is updated but balance `used` is not decremented. Employee's remaining balance appears lower than actual. Future requests may be incorrectly rejected.
- **Severity:** HIGH — Wrong Leave Balance
- **Fix:** Throw an error if `oldBalance` is null when a decrement is needed.

### BUG-11 [MEDIUM] cancelLeave/updateLeave use range query instead of unique lookup
- **File:** `src/lib/actions/leave.ts:391-398, 628-635`
- **Code:** `yearStart: { lte: request.startDate }, yearEnd: { gte: request.startDate }`
- **Trigger:** Employee with non-standard period boundaries (e.g., Feb 29 hire)
- **What happens:** Range query could match the wrong period's balance if periods are misaligned
- **Severity:** MEDIUM — Wrong Leave Balance (edge case)
- **Fix:** Use `getPeriodStartForDate(request.employee.hireDate, request.startDate)` and query by the unique constraint.

---

## Section 3: EOSB (End of Service Benefits) Bugs

### BUG-12 [CRITICAL] EOSB cap does not scale with years of service
- **File:** `src/lib/eosb.ts:37`
- **Code:** `const cap = basicSalary * capMonths`
- **Trigger:** Employee with >12 years of service (when capMonths=24)
- **What happens:** UAE Labor Law Art. 51 says cap is 2 months' salary PER YEAR OF SERVICE. Code caps at `basicSalary * 24` regardless of tenure. A 30-year employee with basicSalary=6000 gets capped at 144,000 instead of the correct uncapped 171,000 (since cap should be 6000 * 2 * 30 = 360,000).
- **Confirmed by test:** `audit.test.ts:347-348` asserts the WRONG behavior (`expect(r.eosbAmount).toBe(144000)`)
- **Severity:** CRITICAL — Wrong Pay. Underpays long-tenure employees.
- **Fix:** `const cap = basicSalary * capMonths * yearsOfService`

### BUG-13 [CRITICAL] capMonths <= 0 produces negative EOSB payout
- **File:** `src/lib/eosb.ts:23,37`
- **Code:** `if (eosbAmount > cap) eosbAmount = cap`
- **Trigger:** `EOSB_CAP_MONTHS` setting is 0 or negative
- **What happens:** cap = basicSalary * 0 = 0, or cap = basicSalary * (-1) = negative. Since eosbAmount > cap, result is clamped to 0 or negative.
- **Confirmed by test:** `audit-bugs.test.ts` — capMonths=-1 with 10 years service returns eosbAmount=-6000
- **Severity:** CRITICAL — Wrong Pay. Employee could be owed NEGATIVE EOSB.
- **Fix:** Add guard: `if (yearsOfService <= 0 || basicSalary <= 0 || capMonths <= 0) return { yearsOfService: roundedYears, eosbAmount: 0 }`

### BUG-14 [MEDIUM] lastSalary stores gross salary, not basic salary
- **File:** `src/lib/actions/employee.ts:537-540,556`
- **Code:**
  ```ts
  const totalSalary = (employee.basicSalary || 0) + (employee.housingAllowance || 0) + ...
  // ...
  lastSalary: totalSalary,
  ```
- **Trigger:** Any employee with non-zero allowances
- **What happens:** EOSB amount was calculated on basicSalary (correct), but lastSalary in the record is total gross. An auditor seeing lastSalary=12000 and eosbAmount=8400 (based on 6000) will be confused.
- **Severity:** MEDIUM — Wrong Data. Audit trail inconsistency.
- **Fix:** Store `lastSalary: monthlySalary` (which is basicSalary). Add a separate field for gross if needed.

### BUG-15 [LOW] yearsOfService returned is rounded but amount uses unrounded
- **File:** `src/lib/eosb.ts:20-21,40`
- **Code:** `const roundedYears = Math.round(yearsOfService * 100) / 100` but `eosbAmount` uses `yearsOfService` (unrounded)
- **Impact:** Minor precision discrepancy between reported and calculated values
- **Severity:** LOW
- **Fix:** Use `roundedYears` for both the return value and the calculation.

---

## Section 4: Attendance/Schedule Bugs

### BUG-16 [HIGH] autoClockout ignores configurable settings
- **File:** `src/lib/actions/attendance.ts:250-252`
- **Code:**
  ```ts
  const shiftEnd = new Date(today)
  shiftEnd.setHours(WORK_END_HOUR, WORK_END_MINUTE, 0, 0)
  ```
- **Trigger:** Admin changes `AUTO_CLOCKOUT_HOUR`/`AUTO_CLOCKOUT_MINUTE` settings
- **What happens:** Uses hardcoded `WORK_END_HOUR=20, WORK_END_MINUTE=30` instead of reading settings via `getAutoClockoutTime()`
- **Confirmed by test:** `audit.test.ts:419-438` — settings are never consulted
- **Severity:** HIGH — Wrong Data. Auto-clockout happens at wrong time.
- **Fix:**
  ```ts
  const { hour: autoHour, minute: autoMinute } = await getAutoClockoutTime()
  const shiftEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), autoHour, autoMinute, 0, 0))
  ```

### BUG-17 [MEDIUM] markAbsent overwrites checked-in records
- **File:** `src/lib/actions/attendance.ts:362-374`
- **Code:**
  ```ts
  update: { status: 'ABSENT', checkInNote: note, adjustedById: session.user.id }
  ```
- **Trigger:** Employee has already checked in, then manager calls markAbsent
- **What happens:** Valid PRESENT record is overwritten with ABSENT. Employee gets absent deduction in payroll.
- **Confirmed by test:** `audit.test.ts:440-451`
- **Severity:** MEDIUM — Wrong Pay. Accidental absence marking triggers deductions.
- **Fix:** Add guard: only update to ABSENT if `checkIn` is null, or return an error if record already has checkIn.

### BUG-18 [LOW] lateMinutes includes grace period instead of minutes past grace
- **File:** `src/lib/schedule.ts:44-51`
- **Code:**
  ```ts
  return { isLate: true, lateMinutes: totalMinutes - startMinutes }
  ```
- **Trigger:** Employee checks in 1 minute past grace period
- **What happens:** lateMinutes = 6 (minutes past start), not 1 (minutes past grace)
- **Impact:** Late deduction is calculated on 6 minutes instead of 1 minute
- **Severity:** LOW — Wrong Pay (small amount, but systematic)
- **Fix:** `return { isLate: true, lateMinutes: totalMinutes - startMinutes - grace }`

---

## Section 5: Timezone/Date Handling Bugs

### BUG-19 [HIGH] Payroll period dates are server-timezone-dependent
- **File:** `src/lib/actions/payroll.ts:245-246` (and 284-285, 435-436)
- **Code:** `new Date(year, month - 1)` creates date in server local timezone
- **Trigger:** Server deployed in any timezone other than UTC
- **What happens:** Period boundaries shift. In UTC+4, `endOfMonth` can exclude the last day of the month from queries.
- **Severity:** HIGH — Wrong Pay. Last day of month excluded from all payroll calculations.
- **Fix:** Use `new Date(Date.UTC(year, month - 1))` everywhere payroll periods are constructed.

### BUG-20 [MEDIUM] autoClockout shift end is timezone-dependent
- **File:** `src/lib/actions/attendance.ts:250-252`
- **Code:** `shiftEnd.setHours(WORK_END_HOUR, WORK_END_MINUTE, 0, 0)` uses local time
- **Trigger:** Server not in UTC+4
- **What happens:** Shift end time is off by the server's timezone offset
- **Severity:** MEDIUM — Wrong Data
- **Fix:** Use `new Date(Date.UTC(...))` with explicit UTC components.

### BUG-21 [MEDIUM] JSON.parse(employee.workWeek) has no error handling
- **File:** `src/lib/actions/leave.ts:99, 492, 601`
- **Code:** `const workWeekArr = JSON.parse(employee.workWeek) as number[]`
- **Trigger:** Employee record with null or invalid workWeek
- **What happens:** `JSON.parse(null)` returns null, then `.includes(day)` throws TypeError (500 error)
- **Severity:** MEDIUM — Server error instead of graceful fallback
- **Fix:**
  ```ts
  let workWeekArr: number[]
  try {
    workWeekArr = JSON.parse(employee.workWeek ?? '[0,1,2,3,4]') as number[]
  } catch {
    workWeekArr = [0, 1, 2, 3, 4]
  }
  ```

---

## Section 6: Data Integrity Issues

### BUG-22 [LOW] Overlapping leave submission race condition
- **File:** `src/lib/actions/leave.ts:119-127`
- **Code:** Overlap check is outside transaction
- **Trigger:** Two simultaneous leave submissions for same employee with overlapping dates
- **What happens:** Both pass the overlap check, both are created. If both approved, balance is double-decremented.
- **Severity:** LOW — Race condition, unlikely in practice but possible
- **Fix:** Move overlap check inside the transaction.

### BUG-23 [LOW] OvertimeRecord unique constraint blocks resubmission after rejection
- **File:** `src/lib/actions/attendance.ts:189-192`
- **Code:** `@@unique([employeeId, date])` on OvertimeRecord
- **Trigger:** Submit OT → reject → try to submit again for same date
- **What happens:** Gets `overtimeAlreadySubmitted` error. Should allow resubmission.
- **Severity:** LOW — UX issue
- **Fix:** In the unique constraint catch, check if existing record is REJECTED and allow update instead of create.

### BUG-24 [LOW] Float precision in leave balance used field
- **File:** `prisma/schema.prisma:119`
- **Schema:** `used Float @default(0)`
- **Trigger:** Many half-day leaves accumulated
- **What happens:** Float precision error could make `remaining` slightly negative (e.g., 0.000000000000001)
- **Severity:** LOW — Latent risk
- **Fix:** Add epsilon in comparison: `if (request.durationDays > remaining + 1e-9)`

---

## Summary by Severity

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 5 | OT overpayment 5x, EOSB cap wrong, negative EOSB, double leave balance, carriedOver truncation |
| **HIGH** | 5 | Annual leave day miscount, payroll period timezone, autoClockout ignores settings, markAbsent overwrite, period start leap year |
| **MEDIUM** | 6 | Finalize no validation, cancel/update balance range query, lastSalary gross vs basic, autoClockout timezone, JSON.parse no error handling, overtime race |
| **LOW** | 8 | Late deduction rounding, totalGross rounding, lateMinutes grace inclusion, workWeek null, overtime resubmission, float precision, date parsing |

---

## Recommended Fix Priority

1. **P0 (Immediate):** BUG-01 (OT rate), BUG-12 (EOSB cap), BUG-13 (negative EOSB), BUG-07 (leap year balance)
2. **P1 (This sprint):** BUG-02 (annual leave days), BUG-08 (carriedOver Float), BUG-19 (payroll timezone), BUG-16 (autoClockout settings)
3. **P2 (Next sprint):** BUG-09 (transaction boundary), BUG-10 (silent balance skip), BUG-17 (markAbsent guard), BUG-21 (workWeek error handling)
4. **P3 (Backlog):** BUG-03, BUG-04, BUG-05, BUG-06, BUG-11, BUG-14, BUG-15, BUG-18, BUG-20, BUG-22, BUG-23, BUG-24
