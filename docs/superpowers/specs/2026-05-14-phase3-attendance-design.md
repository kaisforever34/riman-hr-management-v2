# Phase 3 — Attendance Management Design

**Date:** 2026-05-14
**Project:** Riman HR Management — Riman Fashion
**Phase:** 3 of 6 (Attendance Management)

---

**Riman Fashion**  
Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE  
Phone: +971 508084592 | +971 553730792

---

## Overview

Implement daily attendance tracking for a single-company HR system. Employees check in/out via browser with one-click or manual time entry. Manager can view daily attendance, adjust records, and access monthly reports. Working hours are 11:30 AM – 8:30 PM (configurable for future Friday/Ramadan adjustments).

## Roles & Permissions

| Feature | EMPLOYEE | MANAGER | HR_ADMIN |
|---------|----------|---------|----------|
| Check in/out | ✅ Own | ✅ Own + override others | ❌ Hidden |
| View own attendance | ✅ | ✅ | ❌ |
| View all attendance | ❌ | ✅ | ❌ |
| Override/adjust records | ❌ | ✅ | ❌ |
| Monthly reports | ❌ | ✅ | ❌ |

## Database Schema

New model added to `prisma/schema.prisma`:

### AttendanceRecord
- `id` String @id @default(cuid())
- `employeeId` String (FK → Employee)
- `date` DateTime (date only — no time component)
- `checkIn` DateTime? (timestamp of check-in)
- `checkOut` DateTime? (timestamp of check-out)
- `status` String @default("PRESENT") — PRESENT | LATE | ABSENT | HALF_DAY
- `lateMinutes` Int @default(0) (minutes late beyond scheduled start)
- `earlyLeaveMinutes` Int @default(0) (minutes early before scheduled end)
- `checkInMethod` String @default("CLICK") — CLICK | MANUAL | MANAGER
- `checkOutMethod` String? — CLICK | MANUAL | MANAGER
- `checkInNote` String? (reason for manual/override adjustment)
- `checkOutNote` String?
- `adjustedById` String? (FK → User, who overrode)
- Timestamps
- `@@unique([employeeId, date])` — one record per employee per day
- Cascade delete with Employee

### WorkSchedule (optional for Phase 3)
If needed, a simple settings approach:
- Store work start/end time in a system-level setting (key-value model or env var)
- Default: start=11:30, end=20:30
- Can be extended later for Friday/Ramadan

## Route Structure

### Employee routes
- `GET /[locale]/attendance` — Monthly calendar of own attendance + today's check-in/out buttons

### Manager routes
- `GET /[locale]/manager/attendance` — Today's attendance table (all employees) with override controls
- `GET /[locale]/manager/attendance/reports` — Monthly report per employee (summary counts)

## Data Flow

### Check-in
1. Employee clicks "Check In" → creates `AttendanceRecord` for today with `checkIn = now()`
2. If checking in before 11:30 → status PRESENT, lateMinutes = 0
3. If checking in after 11:30 → status LATE, lateMinutes = minutes after 11:30
4. `checkInMethod` = "CLICK"

### Manual check-in
1. Employee clicks "Manual Check In" → enters time + reason
2. Record created with that time, `checkInMethod` = "MANUAL"
3. Status calculated same as above

### Check-out
1. Employee clicks "Check Out" → updates today's record with `checkOut = now()`
2. If checking out before 20:30 → `earlyLeaveMinutes` = minutes before 20:30
3. `checkOutMethod` = "CLICK" (or "MANUAL")

### Auto-absent
1. End of day (midnight): any employee without a check-in record for today gets an `AttendanceRecord` with status = ABSENT
2. Implemented as a check at read time rather than a cron job — if viewing today's attendance and a record doesn't exist, treat as ABSENT

### Manager override
1. Manager can edit any employee's attendance record for any day
2. Can change: checkIn, checkOut, status, checkInNote
3. `adjustedById` set to manager's user ID
4. `checkInMethod`/`checkOutMethod` set to "MANAGER"

### Status calculation (on check-in)
```
if checkIn <= scheduleStart → status = PRESENT
if checkIn > scheduleStart → status = LATE, lateMinutes = diff
if no checkIn by day end → status = ABSENT (at read time)
```

## Validation

- No duplicate check-in for same day (one record per employee per date)
- Check-out must be after check-in
- Check-in time cannot be in the future
- Manual adjust time must be reasonable (±24h from now)
- Manager override can fix any past date

## Monthly Report

Manager-only view showing per employee:
- Total working days in month
- Present days
- Late days (with average late minutes)
- Absent days
- Half days

## i18n Keys

New translation keys under `attendance`, `managerAttendance` namespaces — following existing pattern from Phase 1/2.

## Out of Scope (Phase 3 -v)

- Overtime calculation
- Geo-location check-in
- Photo/video capture on check-in
- Biometric integration
- Export to Excel/PDF
- Timesheet/break tracking
- Public holiday calendar auto-marking
- Friday/Ramadan schedule (deferred to later config)

---

**Riman Fashion** — Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE  
Phone: +971 508084592 | +971 553730792
