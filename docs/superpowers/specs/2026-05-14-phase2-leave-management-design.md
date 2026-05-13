# Phase 2 — Leave Management Design

**Date:** 2026-05-14
**Project:** Riman HR Management
**Phase:** 2 of 6 (Leave Management)

## Overview

Implement leave management for a single-company HR system serving 3 roles (EMPLOYEE, MANAGER, HR_ADMIN). Manager handles all approvals — no HR department involvement. Supports 8 leave types, yearly balance tracking per employee contract cycle, half-day leaves, and file attachments.

## Roles & Permissions

| Feature | EMPLOYEE | MANAGER | HR_ADMIN |
|---------|----------|---------|----------|
| Submit leave request | ✅ Own only | ✅ Own + team | ❌ Hidden |
| View own requests & balances | ✅ | ✅ | ❌ |
| View all team requests | ❌ | ✅ | ❌ |
| Approve/reject requests | ❌ | ✅ | ❌ |
| Manage leave types | ❌ | ✅ | ❌ |
| Set per-employee allocations | ❌ | ✅ | ❌ |
| Calendar view | ❌ | ✅ | ❌ |
| Cancel any request | ❌ | ✅ | ❌ |

## Leave Types

8 configurable types (manager can enable/disable):

| Name | Name (Ar) | Paid | Default Days | Requires Attachment |
|------|-----------|------|-------------|-------------------|
| Annual | إجازة سنوية | ✅ | 30 | ❌ |
| Sick | إجازة مرضية | ✅ | 15 | ✅ (medical report) |
| Personal | إجازة شخصية | ❌ | 5 | ❌ |
| Maternity | إجازة أمومة | ✅ | 90 | ❌ |
| Paternity | إجازة أبوة | ✅ | 5 | ❌ |
| Hajj/Umrah | إجازة حج وعمرة | ✅ | 21 | ❌ |
| Compassionate | إجازة وفاة | ✅ | 3 | ❌ |
| Unpaid | إجازة بدون راتب | ❌ | 0 | ❌ |

## Database Schema

New models added to existing `prisma/schema.prisma`:

### LeaveType
- `id` String @id @default(cuid())
- `name` String @unique (en: "Annual", "Sick", etc.)
- `nameAr` String? (ar: "إجازة سنوية", etc.)
- `defaultDays` Int @default(0)
- `requiresAttachment` Boolean @default(false)
- `isPaid` Boolean @default(true)
- `isActive` Boolean @default(true)
- Timestamps

### LeaveBalance
- `id` String @id @default(cuid())
- `employeeId` String (FK → Employee)
- `leaveTypeId` String (FK → LeaveType)
- `yearStart` DateTime
- `yearEnd` DateTime
- `allocated` Int @default(0) (days for this cycle)
- `carriedOver` Int @default(0) (from previous cycle)
- `used` Int @default(0) (days consumed)
- `@@unique([employeeId, leaveTypeId, yearStart])`
- Cascade delete with Employee

### LeaveRequest
- `id` String @id @default(cuid())
- `employeeId` String (FK → Employee)
- `leaveTypeId` String (FK → LeaveType)
- `startDate` DateTime
- `endDate` DateTime
- `durationDays` Float (0.5 for half-day)
- `isHalfDay` Boolean @default(false)
- `halfDayPeriod` String? ("morning" | "afternoon")
- `status` String @default("PENDING") (PENDING | APPROVED | REJECTED | CANCELLED)
- `reason` String
- `rejectReason` String?
- `attachmentFile` String? (URL path)
- `approvedById` String? (FK → User)
- `approvedAt` DateTime?
- Timestamps
- Cascade delete with Employee

## Route Structure

### Employee routes
- `GET /[locale]/leave` — Table of own requests + balance card
- `GET /[locale]/leave/new` — Submit form (type, date range, half-day, reason, file)
- `GET /[locale]/leave/[id]` — Request detail view

### Manager routes
- `GET /[locale]/manager/leaves` — Table of all requests (filters: status, employee, type, date)
- `GET /[locale]/manager/leaves/[id]` — Approve/reject detail view
- `GET /[locale]/manager/leaves/calendar` — Month calendar of approved leaves
- `GET /[locale]/manager/leave-types` — Manage types + per-employee allocations

## Data Flow

### Balance computation
```
remaining = allocated + carriedOver - used
```
- `used` = `SUM(durationDays)` of APPROVED LeaveRequests for employee+type in current cycle
- Computed at read time — no stored `remaining` field

### Balance rollover
- On approval of request where current date > existing `yearEnd`:
  - Find previous cycle's `LeaveBalance` for employee+type
  - Create new row: `carriedOver = MAX(0, prev.allocated + prev.carriedOver - prev.used)`, `allocated = defaultDays`, `yearStart/yearEnd = next cycle`
- Negative balance: allowed (carriedOver can be negative)

### Approval lifecycle
1. Submit → status `PENDING`
2. Approve → status `APPROVED`, `used` incremented, `approvedAt` recorded
3. Reject → status `REJECTED`, `rejectReason` saved
4. Cancel (by employee while PENDING) → status `CANCELLED`
5. Cancel (by manager any time) → status `CANCELLED`, `used` decremented

### Half-day
- `isHalfDay=true`, `durationDays=0.5`, `endDate=startDate`
- `halfDayPeriod` = "morning" or "afternoon"

### File upload
- Max 5MB, types: PDF, JPG, PNG
- Stored in `public/uploads/leaves/`
- URL path saved in `attachmentFile`

## Validation

- **Start date** must not be in the past
- **End date** must be >= start date
- **Duration** capped at 365 days per request
- **Sick leave** requires attachment
- **Duplicate request** check: employee cannot have two PENDING or APPROVED requests where date ranges overlap (any day in common)
- **Attachment** size + type validation server-side

## i18n Keys

New translation keys under `leave`, `managerLeaves`, `leaveTypes` namespaces — following existing pattern from Phase 1.

## Out of Scope (Phase 2 -v)

- Email/notification system
- Public holiday calendar
- Leave policy engine (blackout dates, minimum notice, max consecutive)
- Excel/PDF export
- Approval delegation
