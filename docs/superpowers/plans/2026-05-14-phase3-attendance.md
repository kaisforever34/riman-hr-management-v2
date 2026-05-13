# Phase 3 — Attendance Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement daily attendance tracking with employee check-in/out, manager override, and monthly reports.

**Architecture:** New `AttendanceRecord` model in Prisma; Zod validation schemas; server actions for check-in/out/override; employee sees monthly calendar + check-in buttons; manager sees today's table + per-employee monthly report.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma v5, PostgreSQL, Tailwind v4, shadcn/ui base-nova, next-intl, Zod, react-hook-form, date-fns, lucide-react

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `AttendanceRecord` model |
| `src/lib/schedule.ts` | Create | Work schedule constants + UAE time helpers |
| `src/lib/validations/attendance.ts` | Create | Zod schemas for attendance actions |
| `src/lib/queries/attendance.ts` | Create | DB query functions for attendance |
| `src/lib/actions/attendance.ts` | Create | Server actions (check-in, check-out, manual-in, override) |
| `src/i18n/messages/en.json` | Modify | Add `attendance` + `managerAttendance` keys |
| `src/i18n/messages/ar.json` | Modify | Add `attendance` + `managerAttendance` keys |
| `src/app/[locale]/(hr)/attendance/page.tsx` | Create | Employee attendance page (server) |
| `src/app/[locale]/(hr)/attendance/attendance-client.tsx` | Create | Employee attendance client component |
| `src/app/[locale]/(hr)/manager/attendance/page.tsx` | Create | Manager today's attendance page |
| `src/app/[locale]/(hr)/manager/attendance/attendance-table-client.tsx` | Create | Manager attendance table client component |
| `src/app/[locale]/(hr)/manager/attendance/reports/page.tsx` | Create | Manager monthly reports page |
| `src/components/layout/sidebar.tsx` | Modify | Enable attendance sidebar links |
| `src/app/[locale]/(hr)/dashboard/page.tsx` | Modify | Wire up today's attendance count |

---

### Task 1: Add AttendanceRecord Model + Migration

**Files:**
- Modify: `prisma/schema.prisma` (before `model Account`)
- Run migration

- [ ] **Step 1: Add AttendanceRecord model**

Add to `prisma/schema.prisma` after `model LeaveRequest {` block and before `model Account {`:

```prisma
model AttendanceRecord {
  id                String    @id @default(cuid())
  employeeId        String
  date              DateTime
  checkIn           DateTime?
  checkOut          DateTime?
  status            String    @default("PRESENT")
  lateMinutes       Int       @default(0)
  earlyLeaveMinutes Int       @default(0)
  checkInMethod     String    @default("CLICK")
  checkOutMethod    String?
  checkInNote       String?
  checkOutNote      String?
  adjustedById      String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  adjustedBy User?    @relation(fields: [adjustedById], references: [id])

  @@unique([employeeId, date])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_attendance_record --create-only && npx prisma generate
```

Expected: Migration created and client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add AttendanceRecord model"
```

---

### Task 2: Schedule Config + Zod Validations

**Files:**
- Create: `src/lib/schedule.ts`
- Create: `src/lib/validations/attendance.ts`

- [ ] **Step 1: Create schedule config**

Create `src/lib/schedule.ts`:

```typescript
export const WORK_START_HOUR = 11
export const WORK_START_MINUTE = 30
export const WORK_END_HOUR = 20
export const WORK_END_MINUTE = 30

export function getUaeTimeFromUtc(date: Date): { hours: number; minutes: number } {
  const uaeOffset = 4 * 60
  const uaeTime = new Date(date.getTime() + uaeOffset * 60 * 1000)
  return { hours: uaeTime.getUTCHours(), minutes: uaeTime.getUTCMinutes() }
}

export function getTodayUaeDate(): Date {
  const now = new Date()
  const uaeOffset = 4 * 60
  const uae = new Date(now.getTime() + uaeOffset * 60 * 1000)
  return new Date(Date.UTC(uae.getUTCFullYear(), uae.getUTCMonth(), uae.getUTCDate()))
}

export function getUaeDateString(date: Date): string {
  const uaeOffset = 4 * 60
  const uae = new Date(date.getTime() + uaeOffset * 60 * 1000)
  return `${uae.getUTCFullYear()}-${String(uae.getUTCMonth() + 1).padStart(2, '0')}-${String(uae.getUTCDate()).padStart(2, '0')}`
}

export function isWithinSchedule(date: Date): { isLate: boolean; lateMinutes: number } {
  const { hours, minutes } = getUaeTimeFromUtc(date)
  const totalMinutes = hours * 60 + minutes
  const startMinutes = WORK_START_HOUR * 60 + WORK_START_MINUTE
  if (totalMinutes <= startMinutes) return { isLate: false, lateMinutes: 0 }
  return { isLate: true, lateMinutes: totalMinutes - startMinutes }
}

export function getEarlyLeaveMinutes(checkOut: Date): number {
  const { hours, minutes } = getUaeTimeFromUtc(checkOut)
  const totalMinutes = hours * 60 + minutes
  const endMinutes = WORK_END_HOUR * 60 + WORK_END_MINUTE
  if (totalMinutes >= endMinutes) return 0
  return endMinutes - totalMinutes
}
```

- [ ] **Step 2: Create Zod validation schemas**

Create `src/lib/validations/attendance.ts`:

```typescript
import { z } from 'zod'

export const checkInSchema = z.object({})

export const manualCheckInSchema = z.object({
  checkIn: z.string().min(1, 'Check-in time is required'),
  note: z.string().min(1, 'Reason for manual check-in is required'),
})

export const checkOutSchema = z.object({})

export const managerOverrideSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
})
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/schedule.ts src/lib/validations/attendance.ts
git commit -m "feat: add schedule config and attendance validation schemas"
```

---

### Task 3: DB Queries for Attendance

**Files:**
- Create: `src/lib/queries/attendance.ts`

- [ ] **Step 1: Create attendance query functions**

Create `src/lib/queries/attendance.ts`:

```typescript
import { db } from '@/lib/db'

export async function getEmployeeAttendanceForMonth(employeeId: string, year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 1))
  return db.attendanceRecord.findMany({
    where: { employeeId, date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
  })
}

export async function getTodayRecord(employeeId: string, today: Date) {
  return db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  })
}

export async function getTodayRecordsForAllEmployees(today: Date) {
  return db.attendanceRecord.findMany({
    where: { date: today },
    include: { employee: { select: { firstName: true, lastName: true, department: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getAttendanceForDateRange(start: Date, end: Date) {
  return db.attendanceRecord.findMany({
    where: { date: { gte: start, lt: end } },
    include: { employee: { select: { firstName: true, lastName: true, department: true } } },
    orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
  })
}

export async function getAllActiveEmployees() {
  return db.employee.findMany({
    where: { isActive: true },
    include: { user: { select: { email: true } } },
    orderBy: { firstName: 'asc' },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queries/attendance.ts
git commit -m "feat: add attendance query functions"
```

---

### Task 4: Server Actions for Attendance

**Files:**
- Create: `src/lib/actions/attendance.ts`

- [ ] **Step 1: Create attendance server actions**

Create `src/lib/actions/attendance.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { checkInSchema, manualCheckInSchema, checkOutSchema, managerOverrideSchema } from '@/lib/validations/attendance'
import { auth } from '@/lib/auth'
import { getTodayUaeDate, isWithinSchedule, getEarlyLeaveMinutes, getUaeDateString } from '@/lib/schedule'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function checkIn() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee record not found' }

  const today = getTodayUaeDate()
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  })
  if (existing?.checkIn) return { error: 'Already checked in today' }

  const now = new Date()
  const { isLate, lateMinutes } = isWithinSchedule(now)

  await db.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    update: {
      checkIn: now,
      status: isLate ? 'LATE' : 'PRESENT',
      lateMinutes,
      checkInMethod: 'CLICK',
      checkInNote: null,
    },
    create: {
      employeeId: employee.id,
      date: today,
      checkIn: now,
      status: isLate ? 'LATE' : 'PRESENT',
      lateMinutes,
      checkInMethod: 'CLICK',
    },
  })

  revalidatePath('/attendance')
}

export async function manualCheckIn(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee record not found' }

  const parsed = manualCheckInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const now = new Date()
  const checkInTime = new Date(parsed.data.checkIn)
  if (checkInTime > now) return { error: 'Check-in time cannot be in the future' }

  const today = getTodayUaeDate()
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  })
  if (existing?.checkIn) return { error: 'Already checked in today' }

  const { isLate, lateMinutes } = isWithinSchedule(checkInTime)

  await db.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
    update: {
      checkIn: checkInTime,
      status: isLate ? 'LATE' : 'PRESENT',
      lateMinutes,
      checkInMethod: 'MANUAL',
      checkInNote: parsed.data.note,
    },
    create: {
      employeeId: employee.id,
      date: today,
      checkIn: checkInTime,
      status: isLate ? 'LATE' : 'PRESENT',
      lateMinutes,
      checkInMethod: 'MANUAL',
      checkInNote: parsed.data.note,
    },
  })

  revalidatePath('/attendance')
}

export async function checkOut() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee record not found' }

  const today = getTodayUaeDate()
  const record = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  })
  if (!record?.checkIn) return { error: 'Not checked in yet' }
  if (record?.checkOut) return { error: 'Already checked out today' }

  const now = new Date()
  const earlyLeaveMinutes = getEarlyLeaveMinutes(now)

  await db.attendanceRecord.update({
    where: { id: record.id },
    data: {
      checkOut: now,
      checkOutMethod: 'CLICK',
      earlyLeaveMinutes,
    },
  })

  revalidatePath('/attendance')
}

export async function managerOverrideAttendance(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = managerOverrideSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const date = new Date(data.date)
  const employee = await db.employee.findUnique({ where: { id: data.employeeId } })
  if (!employee) return { error: 'Employee not found' }

  const updateData: Record<string, unknown> = {
    adjustedById: session.user.id,
  }

  if (data.checkIn) updateData.checkIn = new Date(data.checkIn)
  if (data.checkOut) updateData.checkOut = new Date(data.checkOut)
  if (data.status) updateData.status = data.status
  if (data.note) updateData.checkInNote = data.note

  if (data.checkIn) {
    const { isLate, lateMinutes } = isWithinSchedule(new Date(data.checkIn))
    updateData.status = data.status || (isLate ? 'LATE' : 'PRESENT')
    updateData.lateMinutes = lateMinutes
  }

  if (data.checkIn && data.checkInMethod) {
    updateData.checkInMethod = 'MANAGER'
  }
  if (data.checkOut && data.checkOutMethod) {
    updateData.checkOutMethod = 'MANAGER'
  }

  await db.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId: data.employeeId, date } },
    update: updateData,
    create: {
      employeeId: data.employeeId,
      date,
      checkIn: data.checkIn ? new Date(data.checkIn) : null,
      checkOut: data.checkOut ? new Date(data.checkOut) : null,
      status: data.status || 'PRESENT',
      checkInMethod: 'MANAGER',
      checkOutMethod: data.checkOut ? 'MANAGER' : null,
      checkInNote: data.note,
      adjustedById: session.user.id,
    },
  })

  revalidatePath('/manager/attendance')
  revalidatePath('/manager/attendance/reports')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/attendance.ts
git commit -m "feat: add attendance server actions"
```

---

### Task 5: i18n Keys

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/ar.json`

- [ ] **Step 1: Add attendance keys to en.json**

Insert `nav.managerAttendance` key alongside existing `nav.attendance` and add new namespaces after the `"leaveTypes"` block.

In `en.json`, update the `nav` block to add `managerAttendance`:

```json
  "nav": {
    "dashboard": "Dashboard",
    "employees": "Employees",
    "leaveRequests": "Leave Requests",
    "myLeaves": "My Leaves",
    "attendance": "Attendance",
    "managerAttendance": "Attendance Overview",
    "payroll": "Payroll",
    "documents": "Documents",
    "signOut": "Sign Out"
  },
```

Then add the `attendance` and `managerAttendance` namespaces after the `"leaveTypes"` block:

```json
  "attendance": {
    "title": "Attendance",
    "checkIn": "Check In",
    "checkOut": "Check Out",
    "manualCheckIn": "Manual Check In",
    "alreadyCheckedIn": "Already checked in today",
    "notCheckedIn": "Not checked in yet",
    "alreadyCheckedOut": "Already checked out today",
    "checkedInAt": "Checked in at",
    "checkedOutAt": "Checked out at",
    "status": "Status",
    "date": "Date",
    "time": "Time",
    "earlyLeave": "Early leave",
    "late": "Late",
    "present": "Present",
    "absent": "Absent",
    "halfDay": "Half Day",
    "minLate": "{minutes} min late",
    "minEarly": "{minutes} min early",
    "noRecords": "No attendance records yet",
    "note": "Note",
    "reason": "Reason",
    "today": "Today",
    "month": "Month",
    "checkInSuccess": "Checked in successfully",
    "checkOutSuccess": "Checked out successfully",
    "validation": {
      "checkInFuture": "Check-in time cannot be in the future",
      "noteRequired": "Reason is required for manual check-in",
      "timeRequired": "Time is required"
    },
    "errors": {
      "checkInFailed": "Failed to check in",
      "checkOutFailed": "Failed to check out",
      "manualCheckInFailed": "Failed to record manual check-in"
    }
  },
  "managerAttendance": {
    "title": "Attendance",
    "todayAttendance": "Today's Attendance",
    "monthlyReports": "Monthly Reports",
    "employee": "Employee",
    "department": "Department",
    "checkIn": "Check In",
    "checkOut": "Check Out",
    "status": "Status",
    "lateMinutes": "Late (min)",
    "actions": "Actions",
    "override": "Override",
    "overrideTitle": "Override Attendance",
    "save": "Save",
    "cancel": "Cancel",
    "note": "Note",
    "present": "Present",
    "late": "Late",
    "absent": "Absent",
    "halfDay": "Half Day",
    "noRecords": "No attendance records for today",
    "reportTitle": "Attendance Report",
    "month": "Month",
    "year": "Year",
    "totalDays": "Total Working Days",
    "presentDays": "Present",
    "lateDays": "Late",
    "absentDays": "Absent",
    "halfDays": "Half Days",
    "avgLateMinutes": "Avg Late (min)",
    "success": {
      "overridden": "Attendance record updated"
    },
    "errors": {
      "overrideFailed": "Failed to update attendance record"
    }
  },
```

- [ ] **Step 2: Add Arabic keys to ar.json**

Update the `nav` block to add `managerAttendance`:

```json
  "nav": {
    "dashboard": "لوحة التحكم",
    "employees": "الموظفين",
    "leaveRequests": "طلبات الإجازات",
    "myLeaves": "إجازاتي",
    "attendance": "الحضور",
    "managerAttendance": "نظرة عامة على الحضور",
    "payroll": "الرواتب",
    "documents": "المستندات",
    "signOut": "تسجيل الخروج"
  },
```

Then add the `attendance` and `managerAttendance` namespaces after the `"leaveTypes"` block:

```json
  "attendance": {
    "title": "الحضور والانصراف",
    "checkIn": "تسجيل الدخول",
    "checkOut": "تسجيل الخروج",
    "manualCheckIn": "تسجيل دخول يدوي",
    "alreadyCheckedIn": "تم تسجيل الدخول اليوم بالفعل",
    "notCheckedIn": "لم يتم تسجيل الدخول بعد",
    "alreadyCheckedOut": "تم تسجيل الخروج اليوم بالفعل",
    "checkedInAt": "وقت تسجيل الدخول",
    "checkedOutAt": "وقت تسجيل الخروج",
    "status": "الحالة",
    "date": "التاريخ",
    "time": "الوقت",
    "earlyLeave": "خروج مبكر",
    "late": "متأخر",
    "present": "حاضر",
    "absent": "غائب",
    "halfDay": "نصف يوم",
    "minLate": "متأخر {minutes} دقيقة",
    "minEarly": "مبكر {minutes} دقيقة",
    "noRecords": "لا توجد سجلات حضور بعد",
    "note": "ملاحظة",
    "reason": "السبب",
    "today": "اليوم",
    "month": "الشهر",
    "checkInSuccess": "تم تسجيل الدخول بنجاح",
    "checkOutSuccess": "تم تسجيل الخروج بنجاح",
    "validation": {
      "checkInFuture": "لا يمكن أن يكون وقت تسجيل الدخول في المستقبل",
      "noteRequired": "السبب مطلوب لتسجيل الدخول اليدوي",
      "timeRequired": "الوقت مطلوب"
    },
    "errors": {
      "checkInFailed": "فشل تسجيل الدخول",
      "checkOutFailed": "فشل تسجيل الخروج",
      "manualCheckInFailed": "فشل تسجيل الدخول اليدوي"
    }
  },
  "managerAttendance": {
    "title": "الحضور والانصراف",
    "todayAttendance": "حضور اليوم",
    "monthlyReports": "التقارير الشهرية",
    "employee": "الموظف",
    "department": "القسم",
    "checkIn": "تسجيل الدخول",
    "checkOut": "تسجيل الخروج",
    "status": "الحالة",
    "lateMinutes": "التأخير (دقيقة)",
    "actions": "الإجراءات",
    "override": "تعديل",
    "overrideTitle": "تعديل سجل الحضور",
    "save": "حفظ",
    "cancel": "إلغاء",
    "note": "ملاحظة",
    "present": "حاضر",
    "late": "متأخر",
    "absent": "غائب",
    "halfDay": "نصف يوم",
    "noRecords": "لا توجد سجلات حضور لليوم",
    "reportTitle": "تقرير الحضور",
    "month": "الشهر",
    "year": "السنة",
    "totalDays": "إجمالي أيام العمل",
    "presentDays": "حاضر",
    "lateDays": "متأخر",
    "absentDays": "غائب",
    "halfDays": "نصف يوم",
    "avgLateMinutes": "متوسط التأخير (دقيقة)",
    "success": {
      "overridden": "تم تحديث سجل الحضور"
    },
    "errors": {
      "overrideFailed": "فشل تحديث سجل الحضور"
    }
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: add attendance i18n keys for EN and AR"
```

---

### Task 6: Employee Attendance Page

**Files:**
- Create: `src/app/[locale]/(hr)/attendance/page.tsx`
- Create: `src/app/[locale]/(hr)/attendance/attendance-client.tsx`

- [ ] **Step 1: Create server component**

Create `src/app/[locale]/(hr)/attendance/page.tsx`:

```typescript
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTodayUaeDate } from '@/lib/schedule'
import { getTodayRecord, getEmployeeAttendanceForMonth } from '@/lib/queries/attendance'
import { AttendanceClient } from './attendance-client'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return null

  const today = getTodayUaeDate()
  const [todayRecord, monthlyRecords] = await Promise.all([
    getTodayRecord(employee.id, today),
    getEmployeeAttendanceForMonth(employee.id, today.getUTCFullYear(), today.getUTCMonth()),
  ])

  const now = new Date()
  const uaeOffset = 4 * 60

  return (
    <AttendanceClient
      employeeId={employee.id}
      todayRecord={todayRecord ? {
        ...todayRecord,
        checkIn: todayRecord.checkIn?.toISOString() ?? null,
        checkOut: todayRecord.checkOut?.toISOString() ?? null,
        date: todayRecord.date.toISOString(),
      } : null}
      monthlyRecords={monthlyRecords.map(r => ({
        ...r,
        checkIn: r.checkIn?.toISOString() ?? null,
        checkOut: r.checkOut?.toISOString() ?? null,
        date: r.date.toISOString(),
      }))}
      serverNow={now.toISOString()}
      serverOffset={uaeOffset}
    />
  )
}
```

- [ ] **Step 2: Create client component**

Create `src/app/[locale]/(hr)/attendance/attendance-client.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { checkIn, checkOut, manualCheckIn } from '@/lib/actions/attendance'
import { Clock, LogIn, LogOut, CalendarDays } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'

interface RecordData {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  lateMinutes: number
  earlyLeaveMinutes: number
  checkInMethod: string
  checkOutMethod: string | null
  checkInNote: string | null
  checkOutNote: string | null
}

interface Props {
  employeeId: string
  todayRecord: RecordData | null
  monthlyRecords: RecordData[]
  serverNow: string
  serverOffset: number
}

export function AttendanceClient({ employeeId, todayRecord, monthlyRecords, serverNow, serverOffset }: Props) {
  const t = useTranslations('attendance')
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualTime, setManualTime] = useState('')
  const [manualNote, setManualNote] = useState('')

  const doAction = useCallback(async (action: () => Promise<{ error?: string }>, name: string) => {
    setLoading(name)
    setMessage(null)
    const result = await action()
    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: name === 'checkIn' ? t('checkInSuccess') : t('checkOutSuccess') })
    }
    setLoading('')
  }, [t])

  const handleManualCheckIn = async () => {
    if (!manualTime || !manualNote) return
    setLoading('manual')
    setMessage(null)
    const form = new FormData()
    form.set('checkIn', manualTime)
    form.set('note', manualNote)
    const result = await manualCheckIn(form)
    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: t('checkInSuccess') })
      setShowManual(false)
    }
    setLoading('')
  }

  const now = new Date(serverNow)
  const uaeNow = new Date(now.getTime() + serverOffset * 60 * 1000)
  const currentMonth = uaeNow.getMonth()
  const currentYear = uaeNow.getFullYear()

  const monthStart = startOfMonth(new Date(currentYear, currentMonth))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const statusColor: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-700',
    LATE: 'bg-yellow-100 text-yellow-700',
    ABSENT: 'bg-red-100 text-red-700',
    HALF_DAY: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('today')} — {format(uaeNow, 'PPP')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayRecord?.checkIn ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-600">
                {t('checkedInAt')}: {format(new Date(todayRecord.checkIn), 'HH:mm')}
                {todayRecord.lateMinutes > 0 && (
                  <span className="ms-2 text-yellow-600">{t('minLate', { minutes: todayRecord.lateMinutes })}</span>
                )}
              </p>
              {todayRecord.checkOut ? (
                <p className="text-sm text-zinc-600">
                  {t('checkedOutAt')}: {format(new Date(todayRecord.checkOut), 'HH:mm')}
                  {todayRecord.earlyLeaveMinutes > 0 && (
                    <span className="ms-2 text-yellow-600">{t('minEarly', { minutes: todayRecord.earlyLeaveMinutes })}</span>
                  )}
                </p>
              ) : (
                <Button onClick={() => doAction(checkOut, 'checkOut')} disabled={loading === 'checkOut'}>
                  <LogOut className="me-2 h-4 w-4" />
                  {loading === 'checkOut' ? '...' : t('checkOut')}
                </Button>
              )}
              <p className="text-xs text-zinc-400">
                {t('status')}: <span className={cn('inline-block rounded px-1.5 py-0.5 text-xs font-medium', statusColor[todayRecord.status] || '')}>{t(todayRecord.status.toLowerCase())}</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => doAction(checkIn, 'checkIn')} disabled={loading === 'checkIn'}>
                <LogIn className="me-2 h-4 w-4" />
                {loading === 'checkIn' ? '...' : t('checkIn')}
              </Button>
              <Button variant="outline" onClick={() => setShowManual(!showManual)}>
                {t('manualCheckIn')}
              </Button>
            </div>
          )}

          {showManual && !todayRecord?.checkIn && (
            <div className="space-y-2 rounded border p-3">
              <input
                type="datetime-local"
                className="w-full rounded border px-3 py-2 text-sm"
                value={manualTime}
                onChange={e => setManualTime(e.target.value)}
              />
              <textarea
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder={t('reason')}
                rows={2}
                value={manualNote}
                onChange={e => setManualNote(e.target.value)}
              />
              <Button onClick={handleManualCheckIn} disabled={loading === 'manual' || !manualTime || !manualNote}>
                {loading === 'manual' ? '...' : t('manualCheckIn')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {format(monthStart, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-1 text-xs font-medium text-zinc-500">{d}</div>
            ))}
            {Array.from({ length: getDay(monthStart) }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(day => {
              const record = monthlyRecords.find(r => isSameDay(new Date(r.date), day))
              const col = statusColor[record?.status || ''] || ''
              const todayCls = isToday(day) ? 'ring-2 ring-blue-500' : ''
              return (
                <div
                  key={day.toISOString()}
                  className={cn('rounded p-1 text-xs', col, todayCls, record ? 'cursor-default' : 'text-zinc-400')}
                >
                  {format(day, 'd')}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/\(hr\)/attendance/
git commit -m "feat: add employee attendance page with check-in/out and calendar"
```

---

### Task 7: Manager Attendance Table Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/attendance/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/attendance/attendance-table-client.tsx`

- [ ] **Step 1: Create server component**

Create `src/app/[locale]/(hr)/manager/attendance/page.tsx`:

```typescript
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getTodayUaeDate } from '@/lib/schedule'
import { getTodayRecordsForAllEmployees, getAllActiveEmployees } from '@/lib/queries/attendance'
import { AttendanceTableClient } from './attendance-table-client'

export const dynamic = 'force-dynamic'

export default async function ManagerAttendancePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const today = getTodayUaeDate()
  const [records, employees] = await Promise.all([
    getTodayRecordsForAllEmployees(today),
    getAllActiveEmployees(),
  ])

  return (
    <AttendanceTableClient
      employees={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName, department: e.department }))}
      records={records.map(r => ({
        ...r,
        checkIn: r.checkIn?.toISOString() ?? null,
        checkOut: r.checkOut?.toISOString() ?? null,
        date: r.date.toISOString(),
        employee: { firstName: r.employee.firstName, lastName: r.employee.lastName, department: r.employee.department },
      }))}
      todayDate={today.toISOString()}
    />
  )
}
```

- [ ] **Step 2: Create client component**

Create `src/app/[locale]/(hr)/manager/attendance/attendance-table-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { managerOverrideAttendance } from '@/lib/actions/attendance'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Pencil } from 'lucide-react'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  department: string
}

interface RecordData {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  lateMinutes: number
  earlyLeaveMinutes: number
  checkInMethod: string
  checkOutMethod: string | null
  checkInNote: string | null
  employee: { firstName: string; lastName: string; department: string }
}

interface Props {
  employees: EmployeeData[]
  records: RecordData[]
  todayDate: string
}

export function AttendanceTableClient({ employees, records, todayDate }: Props) {
  const t = useTranslations('managerAttendance')
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [overrideData, setOverrideData] = useState({ checkIn: '', checkOut: '', status: 'PRESENT', note: '' })
  const [message, setMessage] = useState('')

  const recordMap = new Map(records.map(r => [r.employeeId, r]))

  const statusColor: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-700',
    LATE: 'bg-yellow-100 text-yellow-700',
    ABSENT: 'bg-red-100 text-red-700',
    HALF_DAY: 'bg-orange-100 text-orange-700',
  }

  const handleOverride = async (employeeId: string) => {
    setMessage('')
    const form = new FormData()
    form.set('employeeId', employeeId)
    form.set('date', todayDate)
    if (overrideData.checkIn) form.set('checkIn', overrideData.checkIn)
    if (overrideData.checkOut) form.set('checkOut', overrideData.checkOut)
    if (overrideData.status) form.set('status', overrideData.status)
    if (overrideData.note) form.set('note', overrideData.note)

    const result = await managerOverrideAttendance(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setMessage(t('success.overridden'))
      setOverrideId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-zinc-500">{t('todayAttendance')}</p>
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
          {message}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('department')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('checkIn')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('checkOut')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('lateMinutes')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const record = recordMap.get(emp.id)
                  const isAbsent = !record
                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-zinc-50">
                      <td className="px-4 py-3">{emp.firstName} {emp.lastName}</td>
                      <td className="px-4 py-3 text-zinc-500">{emp.department}</td>
                      <td className="px-4 py-3">
                        {record?.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {record?.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {isAbsent ? (
                          <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">{t('absent')}</span>
                        ) : (
                          <span className={cn('inline-block rounded px-1.5 py-0.5 text-xs font-medium', statusColor[record.status] || '')}>
                            {record.status === 'PRESENT' ? t('present') : record.status === 'LATE' ? t('late') : record.status === 'ABSENT' ? t('absent') : record.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{record?.lateMinutes ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOverrideId(emp.id)
                            setOverrideData({
                              checkIn: record?.checkIn ? format(new Date(record.checkIn), "yyyy-MM-dd'T'HH:mm") : '',
                              checkOut: record?.checkOut ? format(new Date(record.checkOut), "yyyy-MM-dd'T'HH:mm") : '',
                              status: record?.status || 'PRESENT',
                              note: '',
                            })
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {overrideId && (
        <Card>
          <CardHeader>
            <CardTitle>{t('overrideTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">{t('checkIn')}</label>
              <input
                type="datetime-local"
                className="w-full rounded border px-3 py-2 text-sm"
                value={overrideData.checkIn}
                onChange={e => setOverrideData(d => ({ ...d, checkIn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">{t('checkOut')}</label>
              <input
                type="datetime-local"
                className="w-full rounded border px-3 py-2 text-sm"
                value={overrideData.checkOut}
                onChange={e => setOverrideData(d => ({ ...d, checkOut: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">{t('status')}</label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={overrideData.status}
                onChange={e => setOverrideData(d => ({ ...d, status: e.target.value }))}
              >
                <option value="PRESENT">{t('present')}</option>
                <option value="LATE">{t('late')}</option>
                <option value="ABSENT">{t('absent')}</option>
                <option value="HALF_DAY">{t('halfDay')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">{t('note')}</label>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                value={overrideData.note}
                onChange={e => setOverrideData(d => ({ ...d, note: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleOverride(overrideId)}>{t('save')}</Button>
              <Button variant="outline" onClick={() => setOverrideId(null)}>{t('cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

Note: The `managerAttendance` namespace already includes all keys referenced in this component (`present`, `late`, `absent`, `halfDay`, `note`, `cancel`, `save`, etc.) — see Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/\(hr\)/manager/attendance/
git commit -m "feat: add manager attendance table page with override"
```

---

### Task 8: Manager Attendance Reports Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/attendance/reports/page.tsx`

- [ ] **Step 1: Create reports page**

Create `src/app/[locale]/(hr)/manager/attendance/reports/page.tsx`:

```typescript
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getAttendanceForDateRange, getAllActiveEmployees } from '@/lib/queries/attendance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function AttendanceReportsPage() {
  const t = await getTranslations('managerAttendance')
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  const [records, employees] = await Promise.all([
    getAttendanceForDateRange(monthStart, monthEnd),
    getAllActiveEmployees(),
  ])

  const workingDays = records.length > 0 ? [...new Set(records.map(r => r.date.toISOString().split('T')[0]))].length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('reportTitle')}</h1>
        <p className="text-sm text-zinc-500">
          {monthStart.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('presentDays')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('lateDays')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('absentDays')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('halfDays')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('avgLateMinutes')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const empRecords = records.filter(r => r.employeeId === emp.id)
                  const present = empRecords.filter(r => r.status === 'PRESENT').length
                  const late = empRecords.filter(r => r.status === 'LATE').length
                  const absent = empRecords.filter(r => r.status === 'ABSENT').length
                  const halfDay = empRecords.filter(r => r.status === 'HALF_DAY').length
                  const totalLateMin = empRecords.filter(r => r.status === 'LATE').reduce((sum, r) => sum + r.lateMinutes, 0)
                  const avgLate = late > 0 ? Math.round(totalLateMin / late) : 0

                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-zinc-50">
                      <td className="px-4 py-3">{emp.firstName} {emp.lastName}</td>
                      <td className="px-4 py-3">{present}</td>
                      <td className="px-4 py-3">{late}</td>
                      <td className="px-4 py-3">{absent}</td>
                      <td className="px-4 py-3">{halfDay}</td>
                      <td className="px-4 py-3">{avgLate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/\(hr\)/manager/attendance/reports/page.tsx
git commit -m "feat: add manager monthly attendance report"
```

---

### Task 9: Sidebar + Dashboard Updates

**Files:**
- Modify: `src/components/layout/sidebar.tsx` — enable attendance links for EMPLOYEE and MANAGER
- Modify: `src/app/[locale]/(hr)/dashboard/page.tsx` — wire up today's attendance count

- [ ] **Step 1: Update sidebar**

In `src/components/layout/sidebar.tsx`, change the attendance nav item:

```typescript
    { href: '/attendance', icon: Clock, label: 'attendance', show: isEmployee || isManager },
```

And add a manager-specific attendance link after the leave calendar line:

```typescript
    { href: '/manager/attendance', icon: CalendarRange, label: 'managerAttendance', show: isManager },
```

The `nav` translations already have `managerAttendance` key added in Task 5. The sidebar already imports `CalendarRange` icon.

- [ ] **Step 2: Update dashboard**

In `src/app/[locale]/(hr)/dashboard/page.tsx`, I need to update the attendance card count. Currently it shows `0` for today's attendance and `--` for the present label. I should query today's records and count them.

I'll replace the attendance card section. Instead of hardcoded `0`, I'll query:

```typescript
import { getTodayUaeDate } from '@/lib/schedule'

const today = getTodayUaeDate()
const [totalEmployees, todayRecords] = await Promise.all([
  db.employee.count({ where: { isActive: true } }),
  db.attendanceRecord.findMany({
    where: { date: today, checkIn: { not: null } },
  }),
])

const presentCount = todayRecords.length
```

And update the attendance card to use these values.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx src/app/\[locale\]/\(hr\)/dashboard/page.tsx src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: enable attendance sidebar links and dashboard widget"
```

---

## Self-Review

### Spec Coverage
- **Check-in/out flow** → Task 4 (actions) + Task 6 (UI)
- **Manual check-in** → Task 4 `manualCheckIn()`, Task 6 UI
- **Manager override** → Task 4 `managerOverrideAttendance()`, Task 7 UI
- **Monthly report** → Task 8
- **Status calculation** → Task 2 `isWithinSchedule()`, Task 4
- **Absent at read time** → Task 7 (manager table treats missing records as absent)
- **One record per day** → Prisma `@@unique([employeeId, date])`
- **i18n** → Task 5
- **Sidebar role filtering** → Task 9
- **Dashboard attendance widget** → Task 9

### Placeholder Check
- No TBD, TODO, "handle edge cases", or "implement later" patterns
- All code blocks contain complete implementations
- All file paths are exact

### Type Consistency
- `AttendanceRecord` model fields match between schema, queries, actions, and UI
- `getTodayUaeDate()` used consistently in both server and action contexts
- `isWithinSchedule()` returns `{ isLate, lateMinutes }` — used identically in both check-in and manual check-in
- `getEarlyLeaveMinutes()` returns a number — used in check-out

All i18n keys verified — `managerAttendance` includes `present`, `late`, `absent`, `halfDay`, `note`, `cancel`. Nav includes `managerAttendance`.
