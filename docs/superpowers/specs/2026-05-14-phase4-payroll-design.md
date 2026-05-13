# Phase 4 — Payroll Management Design

**Date:** 2026-05-14
**Project:** Riman HR Management — Riman Fashion
**Phase:** 4 of 6 (Payroll Management)

---

**Riman Fashion**  
Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE  
Phone: +971 508084592 | +971 553730792

---

## Overview

Implement monthly payroll processing for a single-manager HR system. Pay is auto-calculated from employee salary + attendance records. Manager reviews, adjusts late deductions, and finalizes. Payslips show full breakdown.

## Roles & Permissions

| Feature | MANAGER | EMPLOYEE | HR_ADMIN |
|---------|---------|----------|----------|
| View payroll periods | ✅ | ❌ | ❌ |
| Process payroll | ✅ | ❌ | ❌ |
| Adjust late deductions | ✅ | ❌ | ❌ |
| Finalize payroll | ✅ | ❌ | ❌ |
| View own payslips | ✅ | ❌ | ❌ |

Employees do not have self-service payslip access in Phase 4 (deferred).

## Database Schema

### PayrollPeriod
- `id` String @id @default(cuid())
- `month` Int (1-12)
- `year` Int
- `status` String @default("DRAFT") — DRAFT | FINALIZED
- `processedAt` DateTime?
- `processedById` String? (FK → User)
- Timestamps
- `@@unique([month, year])`

### Payslip
- `id` String @id @default(cuid())
- `payrollPeriodId` String (FK → PayrollPeriod)
- `employeeId` String (FK → Employee)
- `basicSalary` Decimal (@db.Decimal(10,2)) — employee salary for this period
- `transportationDeduction` Decimal @default(0) (@db.Decimal(10,2))
- `absenceDeduction` Decimal @default(0) (@db.Decimal(10,2))
- `lateDeduction` Decimal @default(0) (@db.Decimal(10,2)) — manager-set amount
- `netPay` Decimal (@db.Decimal(10,2)) — basic - all deductions
- Timestamps
- `@@unique([payrollPeriodId, employeeId])`

### AppSetting (optional)
| Key | Value | Description |
|-----|-------|-------------|
| TRANSPORTATION_AMOUNT | 500 | Fixed monthly transport allowance (deducted pro-rata for annual leave) |
| DAILY_RATE_DIVISOR | 30 | Divisor to calculate daily rate from monthly salary |

## Calculation Logic

```
basicSalary = employee.salary (full monthly salary)
dailyRate = employee.salary / DAILY_RATE_DIVISOR (30)
transportDeduction = (transportationAmount / 30) × annualLeaveDaysInPeriod
absenceDeduction = dailyRate × absentDaysInPeriod
lateDeduction = managerSetAmount
netPay = basicSalary - transportDeduction - absenceDeduction - lateDeduction
```

### Data Sources
- **Annual leave days in period**: count of approved `LeaveRequest` records with status=APPROVED, leaveType.name='Annual', overlapping the payroll period
- **Absent days in period**: count of `AttendanceRecord` with status='ABSENT' for the period
- **Late deduction**: manager enters per employee per period in the payroll edit view
- **Salary**: `Employee.salary` field

## Process Flow

1. Manager navigates to Payroll → sees list of months
2. Manager clicks "Process Month" for an unprocessed period
3. System creates PayrollPeriod (DRAFT) + Payslip for each active employee with auto-calculated values
4. Manager sees table of all employees with their payslips
5. Manager can edit `lateDeduction` per employee inline
6. Manager clicks "Finalize" → locks all payslips, sets status=FINALIZED
7. After finalization, payslips become read-only

### Recalculation
- While DRAFT, any change to attendance or leaves does NOT auto-recalculate. Manager clicks "Recalculate" button to refresh from current attendance data.
- After FINALIZED, no changes allowed.

## Routes

### Manager routes
- `GET /[locale]/manager/payroll` — List of payroll periods with status, totals
- `GET /[locale]/manager/payroll/new` — Select month/year to process
- `GET /[locale]/manager/payroll/[id]` — Payslip table for one period with inline late deduction editing
- `GET /[locale]/manager/payroll/[id]/[employeeId]` — Individual payslip detail view

## Validation

- Cannot create duplicate period for same month/year
- Cannot edit after FINALIZED
- Late deduction must be ≥ 0 and ≤ basicSalary
- Only MANAGER role can access payroll routes
- An employee must have a salary > 0 to receive a payslip

## i18n Keys

New translation keys under `payroll`, `managerPayroll` namespaces — following existing patterns.

## Out of Scope (Phase 4)

- Employee self-service payslip viewing
- PDF/Excel export
- Bank file generation
- Automated bank transfer
- Year-end reports
- Deduction types beyond transport/absence/late
- Overtime calculation
- Allowances (included in salary per spec)
- Leave salary calculations (sick leave paid/unpaid) — all leave is handled by attendance-based deduction rules only

---

**Riman Fashion** — Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE  
Phone: +971 508084592 | +971 553730792
