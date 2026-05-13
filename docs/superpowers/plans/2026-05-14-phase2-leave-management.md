# Phase 2 — Leave Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement leave management with 8 leave types, yearly balance tracking per employee contract cycle, half-day support, file attachments, and manager-only approval workflow.

**Architecture:** New Prisma models (LeaveType, LeaveBalance, LeaveRequest) backed by Zod validation, server actions, and role-aware pages under `(hr)/leave` (employee) and `(hr)/manager/leaves` (manager). The sidebar and all leave pages become role-aware via session query in the HR layout. Calendar uses a simple inline month grid — no external library.

**Tech Stack:** Next.js 15 App Router, Prisma v5, PostgreSQL, Zod, react-hook-form, next-intl, base-ui (existing), date-fns

---

### Task 1: Prisma Schema — Add Leave Models

**Files:**
- Modify: `prisma/schema.prisma`
- Run migration: `npx prisma migrate dev --name add-leave-models`

**Step 1: Add models to schema**

Insert after the `Employee` model:

```prisma
model LeaveType {
  id                  String          @id @default(cuid())
  name                String          @unique
  nameAr              String?
  defaultDays         Int             @default(0)
  requiresAttachment  Boolean         @default(false)
  isPaid              Boolean         @default(true)
  isActive            Boolean         @default(true)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  leaveRequests       LeaveRequest[]
  leaveBalances       LeaveBalance[]
}

model LeaveBalance {
  id              String     @id @default(cuid())
  employeeId      String
  leaveTypeId     String
  yearStart       DateTime
  yearEnd         DateTime
  allocated       Int        @default(0)
  carriedOver     Int        @default(0)
  used            Int        @default(0)
  employee        Employee   @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  leaveType       LeaveType  @relation(fields: [leaveTypeId], references: [id])
  @@unique([employeeId, leaveTypeId, yearStart])
}

model LeaveRequest {
  id              String    @id @default(cuid())
  employeeId      String
  leaveTypeId     String
  startDate       DateTime
  endDate         DateTime
  durationDays    Float
  isHalfDay       Boolean   @default(false)
  halfDayPeriod   String?
  status          String    @default("PENDING")
  reason          String
  rejectReason    String?
  attachmentFile  String?
  approvedById    String?
  approvedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  employee        Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  leaveType       LeaveType @relation(fields: [leaveTypeId], references: [id])
  approvedBy      User?     @relation(fields: [approvedById], references: [id])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-leave-models
```

Expected: New migration folder created, LeaveType/LeaveBalance/LeaveRequest tables added to DB.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add LeaveType, LeaveBalance, LeaveRequest models"
```

---

### Task 2: Seed Leave Types

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add leave type seeding**

Insert before the `console.log` in the `main()` function:

```typescript
const leaveTypes = [
  { name: 'Annual', nameAr: 'إجازة سنوية', defaultDays: 30, isPaid: true, requiresAttachment: false },
  { name: 'Sick', nameAr: 'إجازة مرضية', defaultDays: 15, isPaid: true, requiresAttachment: true },
  { name: 'Personal', nameAr: 'إجازة شخصية', defaultDays: 5, isPaid: false, requiresAttachment: false },
  { name: 'Maternity', nameAr: 'إجازة أمومة', defaultDays: 90, isPaid: true, requiresAttachment: false },
  { name: 'Paternity', nameAr: 'إجازة أبوة', defaultDays: 5, isPaid: true, requiresAttachment: false },
  { name: 'Hajj/Umrah', nameAr: 'إجازة حج وعمرة', defaultDays: 21, isPaid: true, requiresAttachment: false },
  { name: 'Compassionate', nameAr: 'إجازة وفاة', defaultDays: 3, isPaid: true, requiresAttachment: false },
  { name: 'Unpaid', nameAr: 'إجازة بدون راتب', defaultDays: 0, isPaid: false, requiresAttachment: false },
]

for (const lt of leaveTypes) {
  await prisma.leaveType.upsert({
    where: { name: lt.name },
    update: {},
    create: lt,
  })
}
```

- [ ] **Step 2: Run seed**

```bash
npx prisma db seed
```

Expected: "Seed complete" message, 8 leave types in the database.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed default leave types"
```

---

### Task 3: i18n Keys for Leave Module

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/ar.json`

- [ ] **Step 1: Add English leave translations**

Add these keys to `en.json`:

```json
"leave": {
  "title": "My Leaves",
  "submitNew": "Submit Leave Request",
  "noLeaves": "No leave requests yet",
  "noLeavesDesc": "Submit your first leave request to get started.",
  "type": "Leave Type",
  "startDate": "Start Date",
  "endDate": "End Date",
  "duration": "Duration",
  "days": "days",
  "day": "day",
  "status": "Status",
  "reason": "Reason",
  "attachment": "Attachment",
  "attachments": "Attachments",
  "rejectReason": "Rejection Reason",
  "submittedOn": "Submitted on",
  "approvedOn": "Approved on",
  "halfDay": "Half Day",
  "halfDayPeriod": "Period",
  "morning": "Morning",
  "afternoon": "Afternoon",
  "fullDay": "Full Day",
  "selectType": "Select leave type",
  "remaining": "Remaining",
  "total": "Total",
  "balance": "Leave Balance",
  "noBalance": "No balance data",
  "pending": "Pending",
  "approved": "Approved",
  "rejected": "Rejected",
  "cancelled": "Cancelled",
  "statuses": {
    "PENDING": "Pending",
    "APPROVED": "Approved",
    "REJECTED": "Rejected",
    "CANCELLED": "Cancelled"
  },
  "validation": {
    "startDateRequired": "Start date is required",
    "startDatePast": "Start date cannot be in the past",
    "endDateRequired": "End date is required",
    "endDateBeforeStart": "End date must be on or after start date",
    "typeRequired": "Leave type is required",
    "reasonRequired": "Reason is required",
    "durationMax": "Duration cannot exceed 365 days",
    "sickRequiresAttachment": "Sick leave requires a medical report attachment",
    "duplicateRequest": "You already have a pending or approved request overlapping these dates"
  },
  "success": {
    "submitted": "Leave request submitted successfully",
    "cancelled": "Leave request cancelled"
  },
  "errors": {
    "submitFailed": "Failed to submit leave request",
    "cancelFailed": "Failed to cancel leave request"
  }
},
"managerLeaves": {
  "title": "Leave Requests",
  "allRequests": "All Requests",
  "calendar": "Calendar",
  "filterByEmployee": "Filter by employee",
  "filterByStatus": "Filter by status",
  "filterByType": "Filter by type",
  "employee": "Employee",
  "approve": "Approve",
  "reject": "Reject",
  "cancel": "Cancel Request",
  "approveConfirm": "Are you sure you want to approve this request?",
  "rejectConfirm": "Are you sure you want to reject this request?",
  "cancelConfirm": "Are you sure you want to cancel this request?",
  "confirm": "Confirm",
  "rejectionReasonPlaceholder": "Enter reason for rejection...",
  "success": {
    "approved": "Leave request approved",
    "rejected": "Leave request rejected",
    "cancelled": "Leave request cancelled"
  },
  "errors": {
    "approveFailed": "Failed to approve leave request",
    "rejectFailed": "Failed to reject leave request",
    "cancelFailed": "Failed to cancel leave request"
  },
  "noRequests": "No leave requests found",
  "previous": "Previous",
  "next": "Next",
  "month": "Month"
},
"leaveTypes": {
  "title": "Leave Types",
  "enable": "Enable",
  "disable": "Disable",
  "editAllocation": "Edit Allocation",
  "employee": "Employee",
  "currentBalance": "Current Balance",
  "setAllocation": "Set Annual Allocation",
  "save": "Save Allocation",
  "saving": "Saving..."
}
```

- [ ] **Step 2: Add Arabic leave translations**

Add these keys to `ar.json`:

```json
"leave": {
  "title": "إجازاتي",
  "submitNew": "تقديم طلب إجازة",
  "noLeaves": "لا توجد طلبات إجازة بعد",
  "noLeavesDesc": "قدم أول طلب إجازة للبدء.",
  "type": "نوع الإجازة",
  "startDate": "تاريخ البداية",
  "endDate": "تاريخ النهاية",
  "duration": "المدة",
  "days": "أيام",
  "day": "يوم",
  "status": "الحالة",
  "reason": "السبب",
  "attachment": "المرفق",
  "attachments": "المرفقات",
  "rejectReason": "سبب الرفض",
  "submittedOn": "تاريخ التقديم",
  "approvedOn": "تاريخ الموافقة",
  "halfDay": "نصف يوم",
  "halfDayPeriod": "الفترة",
  "morning": "صباحاً",
  "afternoon": "مساءً",
  "fullDay": "يوم كامل",
  "selectType": "اختر نوع الإجازة",
  "remaining": "المتبقي",
  "total": "الإجمالي",
  "balance": "رصيد الإجازات",
  "noBalance": "لا توجد بيانات رصيد",
  "pending": "معلقة",
  "approved": "تمت الموافقة",
  "rejected": "مرفوضة",
  "cancelled": "ملغية",
  "statuses": {
    "PENDING": "معلقة",
    "APPROVED": "تمت الموافقة",
    "REJECTED": "مرفوضة",
    "CANCELLED": "ملغية"
  },
  "validation": {
    "startDateRequired": "تاريخ البداية مطلوب",
    "startDatePast": "لا يمكن أن يكون تاريخ البداية في الماضي",
    "endDateRequired": "تاريخ النهاية مطلوب",
    "endDateBeforeStart": "يجب أن يكون تاريخ النهاية بعد أو يساوي تاريخ البداية",
    "typeRequired": "نوع الإجازة مطلوب",
    "reasonRequired": "السبب مطلوب",
    "durationMax": "لا يمكن أن تتجاوز المدة 365 يوماً",
    "sickRequiresAttachment": "تتطلب الإجازة المرضية إرفاق تقرير طبي",
    "duplicateRequest": "لديك بالفعل طلب معلق أو تمت الموافقة عليه لهذه التواريخ"
  },
  "success": {
    "submitted": "تم تقديم طلب الإجازة بنجاح",
    "cancelled": "تم إلغاء طلب الإجازة"
  },
  "errors": {
    "submitFailed": "فشل تقديم طلب الإجازة",
    "cancelFailed": "فشل إلغاء طلب الإجازة"
  }
},
"managerLeaves": {
  "title": "طلبات الإجازات",
  "allRequests": "جميع الطلبات",
  "calendar": "التقويم",
  "filterByEmployee": "تصفية حسب الموظف",
  "filterByStatus": "تصفية حسب الحالة",
  "filterByType": "تصفية حسب النوع",
  "employee": "الموظف",
  "approve": "موافقة",
  "reject": "رفض",
  "cancel": "إلغاء الطلب",
  "approveConfirm": "هل أنت متأكد من الموافقة على هذا الطلب؟",
  "rejectConfirm": "هل أنت متأكد من رفض هذا الطلب؟",
  "cancelConfirm": "هل أنت متأكد من إلغاء هذا الطلب؟",
  "confirm": "تأكيد",
  "rejectionReasonPlaceholder": "أدخل سبب الرفض...",
  "success": {
    "approved": "تمت الموافقة على طلب الإجازة",
    "rejected": "تم رفض طلب الإجازة",
    "cancelled": "تم إلغاء طلب الإجازة"
  },
  "errors": {
    "approveFailed": "فشل الموافقة على طلب الإجازة",
    "rejectFailed": "فشل رفض طلب الإجازة",
    "cancelFailed": "فشل إلغاء طلب الإجازة"
  },
  "noRequests": "لا توجد طلبات إجازة",
  "previous": "السابق",
  "next": "التالي",
  "month": "الشهر"
},
"leaveTypes": {
  "title": "أنواع الإجازات",
  "enable": "تفعيل",
  "disable": "تعطيل",
  "editAllocation": "تعديل الرصيد",
  "employee": "الموظف",
  "currentBalance": "الرصيد الحالي",
  "setAllocation": "تحديد الرصيد السنوي",
  "save": "حفظ",
  "saving": "جاري الحفظ..."
}
```

- [ ] **Step 3: Add nav keys**

Add `myLeaves: "My Leaves"` and `myLeaves: "إجازاتي"` to the `nav` object in both files.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: add leave management i18n keys"
```

---

### Task 4: Zod Validation Schemas

**Files:**
- Create: `src/lib/validations/leave.ts`

- [ ] **Step 1: Create leave validation file**

```typescript
import { z } from 'zod'

export const leaveTypeSchema = z.enum([
  'Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Hajj/Umrah', 'Compassionate', 'Unpaid',
])

export const submitLeaveSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isHalfDay: z.string().optional(),
  halfDayPeriod: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
})

export const approveLeaveSchema = z.object({
  id: z.string().min(1),
})

export const rejectLeaveSchema = z.object({
  id: z.string().min(1),
  rejectReason: z.string().min(1, 'Rejection reason is required'),
})

export const cancelLeaveSchema = z.object({
  id: z.string().min(1),
})

export const setAllocationSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  allocated: z.coerce.number().int().min(0),
})

export type SubmitLeaveData = z.infer<typeof submitLeaveSchema>
export type SetAllocationData = z.infer<typeof setAllocationSchema>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/leave.ts
git commit -m "feat: add leave validation schemas"
```

---

### Task 5: Leave Database Queries

**Files:**
- Create: `src/lib/queries/leave.ts`

- [ ] **Step 1: Create leave query functions**

```typescript
import { db } from '@/lib/db'
import type { LeaveRequest, LeaveBalance, LeaveType } from '@prisma/client'

export async function getLeaveTypes(): Promise<LeaveType[]> {
  return db.leaveType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
}

export async function getAllLeaveTypes(): Promise<LeaveType[]> {
  return db.leaveType.findMany({ orderBy: { name: 'asc' } })
}

export async function getEmployeeLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  return db.leaveRequest.findMany({
    where: { employeeId },
    include: { leaveType: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
  return db.leaveRequest.findUnique({
    where: { id },
    include: {
      leaveType: true,
      employee: { include: { user: { select: { email: true } } } },
      approvedBy: { select: { email: true } },
    },
  })
}

export async function getManagerAllRequests(filters?: {
  employeeId?: string
  status?: string
  leaveTypeId?: string
}): Promise<LeaveRequest[]> {
  return db.leaveRequest.findMany({
    where: {
      ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
    },
    include: {
      leaveType: true,
      employee: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getEmployeeLeaveBalances(employeeId: string): Promise<(LeaveBalance & { leaveType: LeaveType })[]> {
  return db.leaveBalance.findMany({
    where: { employeeId },
    include: { leaveType: true },
    orderBy: { leaveType: { name: 'asc' } },
  })
}

export async function getOrCreateLeaveBalance(employeeId: string, leaveTypeId: string, hireDate: Date): Promise<LeaveBalance> {
  const now = new Date()
  const yearStart = new Date(Date.UTC(now.getFullYear(), hireDate.getMonth(), hireDate.getDate()))
  if (yearStart > now) {
    yearStart.setFullYear(yearStart.getFullYear() - 1)
  }
  const yearEnd = new Date(yearStart)
  yearEnd.setFullYear(yearEnd.getFullYear() + 1)
  yearEnd.setDate(yearEnd.getDate() - 1)

  let balance = await db.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_yearStart: { employeeId, leaveTypeId, yearStart } },
  })

  if (!balance) {
    const leaveType = await db.leaveType.findUniqueOrThrow({ where: { id: leaveTypeId } })
    balance = await db.leaveBalance.create({
      data: { employeeId, leaveTypeId, yearStart, yearEnd, allocated: leaveType.defaultDays, carriedOver: 0, used: 0 },
    })
  }

  return balance
}

export async function getEmployees(): Promise<{ id: string; firstName: string; lastName: string }[]> {
  return db.employee.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queries/leave.ts
git commit -m "feat: add leave database query functions"
```

---

### Task 6: File Upload Utility

**Files:**
- Create: `src/lib/upload.ts`

- [ ] **Step 1: Create file upload helper**

```typescript
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'leaves')
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export async function uploadLeaveAttachment(file: File): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type)) return null
  if (file.size > MAX_SIZE) return null

  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), buffer)

  return `/uploads/leaves/${filename}`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/upload.ts
git commit -m "feat: add file upload utility for leave attachments"
```

---

### Task 7: Leave Server Actions

**Files:**
- Create: `src/lib/actions/leave.ts`

- [ ] **Step 1: Create all leave server actions**

```typescript
'use server'

import { db } from '@/lib/db'
import { submitLeaveSchema, approveLeaveSchema, rejectLeaveSchema, cancelLeaveSchema, setAllocationSchema } from '@/lib/validations/leave'
import { auth } from '@/lib/auth'
import { uploadLeaveAttachment } from '@/lib/upload'
import { getOrCreateLeaveBalance } from '@/lib/queries/leave'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function submitLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee record not found' }

  const raw = {
    leaveTypeId: formData.get('leaveTypeId') as string,
    startDate: formData.get('startDate') as string,
    endDate: formData.get('endDate') as string,
    isHalfDay: formData.get('isHalfDay') as string,
    halfDayPeriod: formData.get('halfDayPeriod') as string,
    reason: formData.get('reason') as string,
  }

  const parsed = submitLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }

  const data = parsed.data
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const isHalfDay = data.isHalfDay === 'true'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (start < today) return { error: 'Start date cannot be in the past' }
  if (end < start) return { error: 'End date must be on or after start date' }

  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  const durationDays = isHalfDay ? 0.5 : diffDays

  if (!isHalfDay && durationDays > 365) return { error: 'Duration cannot exceed 365 days' }

  const leaveType = await db.leaveType.findUnique({ where: { id: data.leaveTypeId } })
  if (!leaveType || !leaveType.isActive) return { error: 'Invalid leave type' }

  if (leaveType.requiresAttachment) {
    const file = formData.get('attachment') as File
    if (!file || file.size === 0) return { error: 'Sick leave requires a medical report attachment' }
  }

  const overlapping = await db.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { startDate: { lte: end }, endDate: { gte: start } },
      ],
    },
  })
  if (overlapping) return { error: 'You already have a pending or approved request overlapping these dates' }

  let attachmentFile: string | null = null
  const file = formData.get('attachment') as File
  if (file && file.size > 0) {
    attachmentFile = await uploadLeaveAttachment(file)
    if (!attachmentFile) return { error: 'Invalid attachment file (max 5MB, PDF/JPG/PNG only)' }
  }

  await db.leaveRequest.create({
    data: {
      employeeId: employee.id,
      leaveTypeId: data.leaveTypeId,
      startDate: start,
      endDate: end,
      durationDays,
      isHalfDay,
      halfDayPeriod: isHalfDay ? data.halfDayPeriod : null,
      reason: data.reason,
      attachmentFile,
      status: 'PENDING',
    },
  })

  revalidatePath('/leave')
  redirect('/leave')
}

export async function approveLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const raw = { id: formData.get('id') as string }
  const parsed = approveLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid request' }

  const request = await db.leaveRequest.findUnique({
    where: { id: parsed.data.id },
    include: { employee: true },
  })
  if (!request || request.status !== 'PENDING') return { error: 'Request not found or already processed' }

  const now = new Date()
  let balance = await getOrCreateLeaveBalance(request.employeeId, request.leaveTypeId, request.employee.hireDate)
  const yearEnd = new Date(balance.yearEnd)
  if (now > yearEnd) {
    const carriedOver = Math.max(0, balance.allocated + balance.carriedOver - balance.used)
    const yearStart = new Date(balance.yearStart)
    yearStart.setFullYear(yearStart.getFullYear() + 1)
    const newYearEnd = new Date(yearStart)
    newYearEnd.setFullYear(newYearEnd.getFullYear() + 1)
    newYearEnd.setDate(newYearEnd.getDate() - 1)
    const leaveType = await db.leaveType.findUniqueOrThrow({ where: { id: request.leaveTypeId } })
    balance = await db.leaveBalance.create({
      data: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        yearStart,
        yearEnd: newYearEnd,
        allocated: leaveType.defaultDays,
        carriedOver,
        used: 0,
      },
    })
  }

  await db.leaveRequest.update({
    where: { id: parsed.data.id },
    data: { status: 'APPROVED', approvedById: session.user.id, approvedAt: now },
  })

  await db.leaveBalance.update({
    where: { id: balance.id },
    data: { used: balance.used + request.durationDays },
  })

  revalidatePath('/manager/leaves')
  redirect('/manager/leaves')
}

export async function rejectLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const raw = {
    id: formData.get('id') as string,
    rejectReason: formData.get('rejectReason') as string,
  }
  const parsed = rejectLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Rejection reason is required' }

  const request = await db.leaveRequest.findUnique({ where: { id: parsed.data.id } })
  if (!request || request.status !== 'PENDING') return { error: 'Request not found or already processed' }

  await db.leaveRequest.update({
    where: { id: parsed.data.id },
    data: { status: 'REJECTED', rejectReason: parsed.data.rejectReason, approvedById: session.user.id },
  })

  revalidatePath('/manager/leaves')
  redirect('/manager/leaves')
}

export async function cancelLeave(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const raw = { id: formData.get('id') as string }
  const parsed = cancelLeaveSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid request' }

  const request = await db.leaveRequest.findUnique({
    where: { id: parsed.data.id },
    include: { employee: true },
  })
  if (!request) return { error: 'Request not found' }

  const isOwner = request.employee.userId === session.user.id
  const isManager = session.user.role === 'MANAGER'
  if (!isOwner && !isManager) return { error: 'Unauthorized' }
  if (isOwner && !isManager && request.status !== 'PENDING') return { error: 'Cannot cancel a processed request' }

  await db.leaveRequest.update({
    where: { id: parsed.data.id },
    data: { status: 'CANCELLED' },
  })

  if (request.status === 'APPROVED') {
    const balance = await db.leaveBalance.findFirst({
      where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, yearStart: { lte: request.createdAt }, yearEnd: { gte: request.createdAt } },
    })
    if (balance) {
      await db.leaveBalance.update({
        where: { id: balance.id },
        data: { used: { decrement: request.durationDays } },
      })
    }
  }

  revalidatePath('/leave')
  revalidatePath('/manager/leaves')
}

export async function setAllocation(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const raw = {
    employeeId: formData.get('employeeId') as string,
    leaveTypeId: formData.get('leaveTypeId') as string,
    allocated: formData.get('allocated') as string,
  }
  const parsed = setAllocationSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid allocation data' }

  const employee = await db.employee.findUnique({ where: { id: parsed.data.employeeId } })
  if (!employee) return { error: 'Employee not found' }

  const now = new Date()
  const yearStart = new Date(Date.UTC(now.getFullYear(), employee.hireDate.getMonth(), employee.hireDate.getDate()))
  if (yearStart > now) yearStart.setFullYear(yearStart.getFullYear() - 1)
  const yearEnd = new Date(yearStart)
  yearEnd.setFullYear(yearEnd.getFullYear() + 1)
  yearEnd.setDate(yearEnd.getDate() - 1)

  await db.leaveBalance.upsert({
    where: { employeeId_leaveTypeId_yearStart: { employeeId: parsed.data.employeeId, leaveTypeId: parsed.data.leaveTypeId, yearStart } },
    update: { allocated: parsed.data.allocated },
    create: {
      employeeId: parsed.data.employeeId,
      leaveTypeId: parsed.data.leaveTypeId,
      yearStart,
      yearEnd,
      allocated: parsed.data.allocated,
    },
  })

  revalidatePath('/manager/leave-types')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/leave.ts
git commit -m "feat: add leave server actions (submit, approve, reject, cancel, set allocation)"
```

---

### Task 8: Sidebar & Layout — Role-Aware Leave Links

**Files:**
- Modify: `src/app/[locale]/(hr)/layout.tsx`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Update layout to pass user role**

```tsx
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HrLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar role={session.user.role} />
      <div className="lg:ps-64">
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update sidebar to filter by role**

Replace `const navItems = [...]` and the component:

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarRange,
  Clock,
  Banknote,
  FolderOpen,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  role: string
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const { locale } = useParams<{ locale: string }>()
  const t = useTranslations('nav')

  const isManager = role === 'MANAGER'
  const isEmployee = role === 'EMPLOYEE'

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard', show: true },
    { href: '/employees', icon: Users, label: 'employees', show: isManager || role === 'HR_ADMIN' },
    { href: '/leave', icon: CalendarCheck, label: 'myLeaves', show: isEmployee || isManager },
    { href: '/manager/leaves', icon: CalendarRange, label: 'leaveRequests', show: isManager },
    { href: '/attendance', icon: Clock, label: 'attendance', show: false },
    { href: '/payroll', icon: Banknote, label: 'payroll', show: false },
    { href: '/documents', icon: FolderOpen, label: 'documents', show: false },
  ].filter((item) => item.show)

  return (
    <aside className="fixed inset-y-0 start-0 z-20 hidden w-64 flex-col border-e bg-white lg:flex">
      <div className="flex h-14 items-center border-b px-6">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="h-5 w-5" />
          <span>Riman HR</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const href = `/${locale}${item.href}`
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={item.href} href={href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start', isActive && 'bg-zinc-100')}
              >
                <item.icon className="me-2 h-4 w-4" />
                {t(item.label)}
              </Button>
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-600"
          onClick={() => signOut({ callbackUrl: `/${locale}/auth/signin` })}
        >
          <LogOut className="me-2 h-4 w-4" />
          {t('signOut')}
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Add `myLeaves` translation key**

Already added in Task 3 nav keys. Verify it exists in both locale files.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/(hr)/layout.tsx src/components/layout/sidebar.tsx
git commit -m "feat: make sidebar role-aware with leave links"
```

---

### Task 9: Employee Leave List Page

**Files:**
- Create: `src/app/[locale]/(hr)/leave/page.tsx`

- [ ] **Step 1: Create leave list page**

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getEmployeeLeaveRequests, getEmployeeLeaveBalances, getLeaveTypes } from '@/lib/queries/leave'
import LeaveClient from './leave-client'

export default async function LeavePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) redirect(`/${locale}/dashboard`)

  const [requests, balances, leaveTypes] = await Promise.all([
    getEmployeeLeaveRequests(employee.id),
    getEmployeeLeaveBalances(employee.id),
    getLeaveTypes(),
  ])

  return (
    <LeaveClient
      requests={JSON.parse(JSON.stringify(requests))}
      balances={JSON.parse(JSON.stringify(balances))}
      leaveTypes={JSON.parse(JSON.stringify(leaveTypes))}
      locale={locale}
    />
  )
}
```

- [ ] **Step 2: Create leave client component**

Create `src/app/[locale]/(hr)/leave/leave-client.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface LeaveClientProps {
  requests: any[]
  balances: any[]
  leaveTypes: any[]
  locale: string
}

export default function LeaveClient({ requests, balances, leaveTypes, locale }: LeaveClientProps) {
  const t = useTranslations('leave')
  const tc = useTranslations('common')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href={`/${locale}/leave/new`} className={buttonVariants()}>
          <Plus className="me-2 h-4 w-4" />
          {t('submitNew')}
        </Link>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">{t('noBalance')}</p>
        )}
        {balances.map((b: any) => (
          <div key={b.id} className="rounded-lg border bg-white p-4">
            <p className="text-sm font-medium">{b.leaveType.name}</p>
            <p className="mt-1 text-2xl font-bold">
              {b.allocated + b.carriedOver - b.used}
              <span className="text-sm font-normal text-muted-foreground">
                /{b.allocated + b.carriedOver} {t('days')}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      {requests.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-muted-foreground">{t('noLeaves')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('noLeavesDesc')}</p>
          <Link href={`/${locale}/leave/new`} className={buttonVariants({ className: 'mt-4' })}>
            {t('submitNew')}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left">
                <th className="p-3 font-medium">{t('type')}</th>
                <th className="p-3 font-medium">{t('startDate')}</th>
                <th className="p-3 font-medium">{t('endDate')}</th>
                <th className="p-3 font-medium">{t('duration')}</th>
                <th className="p-3 font-medium">{t('status')}</th>
                <th className="p-3 font-medium">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                  <td className="p-3">{r.leaveType.name}</td>
                  <td className="p-3">{new Date(r.startDate).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(r.endDate).toLocaleDateString()}</td>
                  <td className="p-3">{r.durationDays} {r.durationDays === 1 ? t('day') : t('days')}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      r.status === 'CANCELLED' ? 'bg-zinc-100 text-zinc-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {t(`statuses.${r.status}`)}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link href={`/${locale}/leave/${r.id}`} className="text-sm text-blue-600 hover:underline">
                      {tc('view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(hr)/leave/
git commit -m "feat: add employee leave list page with balance cards"
```

---

### Task 10: Employee Submit Leave Page

**Files:**
- Create: `src/app/[locale]/(hr)/leave/new/page.tsx`

- [ ] **Step 1: Create submit leave page**

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitLeaveSchema, type SubmitLeaveData } from '@/lib/validations/leave'
import { submitLeave } from '@/lib/actions/leave'
import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import { getLeaveTypes } from '@/lib/queries/leave'

export default function SubmitLeavePage() {
  const t = useTranslations('leave')
  const tc = useTranslations('common')
  const { locale } = useParams<{ locale: string }>()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  useState(() => {
    getLeaveTypes().then(setLeaveTypes)
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubmitLeaveData>({
    resolver: zodResolver(submitLeaveSchema),
  })

  async function onSubmit(data: SubmitLeaveData) {
    setServerError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('leaveTypeId', data.leaveTypeId)
    formData.append('startDate', data.startDate)
    formData.append('endDate', data.endDate)
    formData.append('isHalfDay', isHalfDay ? 'true' : 'false')
    if (isHalfDay && data.halfDayPeriod) formData.append('halfDayPeriod', data.halfDayPeriod)
    formData.append('reason', data.reason)
    if (attachmentFile) formData.append('attachment', attachmentFile)

    const result = await submitLeave(formData)
    if (result?.error) {
      setServerError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/leave`} className="text-sm text-blue-600 hover:underline">
          <ArrowLeft className="me-1 inline h-4 w-4" />
          {tc('back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('submitNew')}</h1>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>{t('type')} *</Label>
              <Select onValueChange={(v) => setValue('leaveTypeId', v ?? '')} value={watch('leaveTypeId')}>
                <SelectTrigger><SelectValue placeholder={t('selectType')} /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt: any) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leaveTypeId && <p className="text-sm text-red-500">{errors.leaveTypeId.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('startDate')} *</Label>
                <Input id="startDate" type="date" {...register('startDate')} disabled={loading} />
                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
              </div>
              {!isHalfDay && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('endDate')} *</Label>
                  <Input id="endDate" type="date" {...register('endDate')} disabled={loading} />
                  {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isHalfDay} onChange={(e) => setIsHalfDay(e.target.checked)} />
                {t('halfDay')}
              </label>
              {isHalfDay && (
                <Select onValueChange={(v) => setValue('halfDayPeriod', v ?? undefined)} value={watch('halfDayPeriod')}>
                  <SelectTrigger><SelectValue placeholder={t('halfDayPeriod')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{t('morning')}</SelectItem>
                    <SelectItem value="afternoon">{t('afternoon')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{t('reason')} *</Label>
              <textarea
                id="reason"
                {...register('reason')}
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                rows={3}
                disabled={loading}
              />
              {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">{t('attachment')}</Label>
              <Input
                id="attachment"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" disabled={loading} asChild>
            <Link href={`/${locale}/leave`}>{tc('cancel')}</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('submitting') : t('submitNew')}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

Wait, the submit page uses `getLeaveTypes` which is an async server function called from a client component. This won't work directly. I need to either fetch on the server or make the query available via an API/action. The simplest fix: pass leave types as props from a parent server component.

- [ ] **Step 2: Fix — wrap client form in a server component**

Create `src/app/[locale]/(hr)/leave/new/page.tsx` as server component:

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getLeaveTypes } from '@/lib/queries/leave'
import SubmitLeaveForm from './submit-leave-form'

export default async function NewLeavePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)
  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) redirect(`/${locale}/dashboard`)

  const leaveTypes = await getLeaveTypes()
  return <SubmitLeaveForm leaveTypes={JSON.parse(JSON.stringify(leaveTypes))} locale={locale} />
}
```

Create `src/app/[locale]/(hr)/leave/new/submit-leave-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitLeaveSchema, type SubmitLeaveData } from '@/lib/validations/leave'
import { submitLeave } from '@/lib/actions/leave'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface SubmitLeaveFormProps {
  leaveTypes: { id: string; name: string; requiresAttachment: boolean }[]
  locale: string
}

export default function SubmitLeaveForm({ leaveTypes }: SubmitLeaveFormProps) {
  const t = useTranslations('leave')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubmitLeaveData>({
    resolver: zodResolver(submitLeaveSchema),
  })

  const selectedType = leaveTypes.find((lt) => lt.id === watch('leaveTypeId'))

  async function onSubmit(data: SubmitLeaveData) {
    setServerError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('leaveTypeId', data.leaveTypeId)
    formData.append('startDate', data.startDate)
    formData.append('endDate', data.endDate)
    formData.append('isHalfDay', isHalfDay ? 'true' : 'false')
    if (isHalfDay && data.halfDayPeriod) formData.append('halfDayPeriod', data.halfDayPeriod)
    formData.append('reason', data.reason)
    if (attachmentFile) formData.append('attachment', attachmentFile)

    const result = await submitLeave(formData)
    if (result?.error) {
      setServerError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/leave`} className="text-sm text-blue-600 hover:underline">
          <ArrowLeft className="me-1 inline h-4 w-4" />
          {tc('back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('submitNew')}</h1>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>{t('type')} *</Label>
              <Select onValueChange={(v) => setValue('leaveTypeId', v ?? '')} value={watch('leaveTypeId') || ''}>
                <SelectTrigger><SelectValue placeholder={t('selectType')} /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leaveTypeId && <p className="text-sm text-red-500">{errors.leaveTypeId.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('startDate')} *</Label>
                <Input id="startDate" type="date" {...register('startDate')} disabled={loading} />
                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
              </div>
              {!isHalfDay && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('endDate')} *</Label>
                  <Input id="endDate" type="date" {...register('endDate')} disabled={loading} />
                  {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isHalfDay} onChange={(e) => setIsHalfDay(e.target.checked)} />
                {t('halfDay')}
              </label>
              {isHalfDay && (
                <Select onValueChange={(v) => setValue('halfDayPeriod', v ?? '')} value={watch('halfDayPeriod') || ''}>
                  <SelectTrigger><SelectValue placeholder={t('halfDayPeriod')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{t('morning')}</SelectItem>
                    <SelectItem value="afternoon">{t('afternoon')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{t('reason')} *</Label>
              <textarea
                id="reason"
                {...register('reason')}
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                rows={3}
                disabled={loading}
              />
              {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">
                {t('attachment')}
                {selectedType?.requiresAttachment && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                id="attachment"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                disabled={loading}
              />
              {selectedType?.requiresAttachment && (
                <p className="text-xs text-muted-foreground">{t('validation.sickRequiresAttachment')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href={`/${locale}/leave`} className={buttonVariants({ variant: 'outline' })}>
            {tc('cancel')}
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? t('submitting') : t('submitNew')}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(hr)/leave/new/
git commit -m "feat: add employee leave submit form"
```

---

### Task 11: Leave Detail Page

**Files:**
- Create: `src/app/[locale]/(hr)/leave/[id]/page.tsx`

- [ ] **Step 1: Create leave detail page**

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getLeaveRequestById } from '@/lib/queries/leave'
import { cancelLeave } from '@/lib/actions/leave'
import LeaveDetailClient from './leave-detail-client'

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const request = await getLeaveRequestById(id)
  if (!request) redirect(`/${locale}/leave`)

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee && !['MANAGER', 'HR_ADMIN'].includes(session.user.role)) redirect(`/${locale}/dashboard`)
  if (employee && request.employeeId !== employee.id && session.user.role !== 'MANAGER') redirect(`/${locale}/leave`)

  return (
    <LeaveDetailClient
      request={JSON.parse(JSON.stringify(request))}
      role={session.user.role}
      locale={locale}
    />
  )
}
```

Create `src/app/[locale]/(hr)/leave/[id]/leave-detail-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cancelLeave } from '@/lib/actions/leave'

interface LeaveDetailClientProps {
  request: any
  role: string
  locale: string
}

export default function LeaveDetailClient({ request, role, locale }: LeaveDetailClientProps) {
  const t = useTranslations('leave')
  const tc = useTranslations('common')
  const [cancelling, setCancelling] = useState(false)

  const isManager = role === 'MANAGER'
  const canCancel = request.status === 'PENDING' || (isManager && request.status === 'APPROVED')

  async function handleCancel() {
    setCancelling(true)
    const formData = new FormData()
    formData.append('id', request.id)
    await cancelLeave(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={isManager ? `/${locale}/manager/leaves` : `/${locale}/leave`}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('type')}</p>
            <p className="font-medium">{request.leaveType.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('status')}</p>
            <p className="font-medium">{t(`statuses.${request.status}`)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('startDate')}</p>
            <p className="font-medium">{new Date(request.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('endDate')}</p>
            <p className="font-medium">{new Date(request.endDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('duration')}</p>
            <p className="font-medium">{request.durationDays} {request.durationDays === 1 ? t('day') : t('days')}</p>
          </div>
          {request.isHalfDay && (
            <div>
              <p className="text-sm text-muted-foreground">{t('halfDayPeriod')}</p>
              <p className="font-medium">{t(request.halfDayPeriod)}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{t('reason')}</p>
          <p className="mt-1">{request.reason}</p>
        </div>

        {request.rejectReason && (
          <div>
            <p className="text-sm text-muted-foreground">{t('rejectReason')}</p>
            <p className="mt-1 text-red-600">{request.rejectReason}</p>
          </div>
        )}

        {request.attachmentFile && (
          <div>
            <p className="text-sm text-muted-foreground">{t('attachment')}</p>
            <a href={request.attachmentFile} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              {t('view')}
            </a>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>{t('submittedOn')}: {new Date(request.createdAt).toLocaleDateString()}</p>
          {request.approvedAt && <p>{t('approvedOn')}: {new Date(request.approvedAt).toLocaleDateString()}</p>}
        </div>

        {canCancel && (
          <form action={handleCancel}>
            <Button variant="outline" type="submit" disabled={cancelling} className="text-red-600">
              {cancelling ? tc('loading') : t('cancelled')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/(hr)/leave/\[id\]/
git commit -m "feat: add leave detail page with cancel action"
```

---

### Task 12: Manager Leave Requests Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/leaves/page.tsx`

- [ ] **Step 1: Create manager leave requests page**

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getManagerAllRequests, getLeaveTypes, getEmployees } from '@/lib/queries/leave'
import ManagerLeavesClient from './manager-leaves-client'

export default async function ManagerLeavesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ employeeId?: string; status?: string; leaveTypeId?: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') redirect(`/${locale}/auth/signin`)

  const filters = await searchParams
  const [requests, leaveTypes, employees] = await Promise.all([
    getManagerAllRequests(filters),
    getAllLeaveTypes(),
    getEmployees(),
  ])

  return (
    <ManagerLeavesClient
      requests={JSON.parse(JSON.stringify(requests))}
      leaveTypes={JSON.parse(JSON.stringify(leaveTypes))}
      employees={JSON.parse(JSON.stringify(employees))}
      locale={locale}
      currentFilters={filters}
    />
  )
}
```

Create `src/app/[locale]/(hr)/manager/leaves/manager-leaves-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Check, X, Calendar } from 'lucide-react'

interface ManagerLeavesClientProps {
  requests: any[]
  leaveTypes: any[]
  employees: { id: string; firstName: string; lastName: string }[]
  locale: string
  currentFilters: Record<string, string | undefined>
}

export default function ManagerLeavesClient({
  requests,
  leaveTypes,
  employees,
  locale,
  currentFilters,
}: ManagerLeavesClientProps) {
  const t = useTranslations('managerLeaves')
  const tc = useTranslations('common')
  const tl = useTranslations('leave')
  const router = useRouter()

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(currentFilters as Record<string, string>)
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/${locale}/manager/leaves?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href={`/${locale}/manager/leaves/calendar`} className={buttonVariants({ variant: 'outline' })}>
          <Calendar className="me-2 h-4 w-4" />
          {t('calendar')}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label className="text-xs">{t('filterByEmployee')}</Label>
          <Select onValueChange={(v) => applyFilter('employeeId', v ?? '')} value={currentFilters.employeeId || ''}>
            <SelectTrigger><SelectValue placeholder={tl('selectType')} /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('filterByStatus')}</Label>
          <Select onValueChange={(v) => applyFilter('status', v ?? '')} value={currentFilters.status || ''}>
            <SelectTrigger><SelectValue placeholder={tl('selectType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">{tl('statuses.PENDING')}</SelectItem>
              <SelectItem value="APPROVED">{tl('statuses.APPROVED')}</SelectItem>
              <SelectItem value="REJECTED">{tl('statuses.REJECTED')}</SelectItem>
              <SelectItem value="CANCELLED">{tl('statuses.CANCELLED')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('filterByType')}</Label>
          <Select onValueChange={(v) => applyFilter('leaveTypeId', v ?? '')} value={currentFilters.leaveTypeId || ''}>
            <SelectTrigger><SelectValue placeholder={tl('selectType')} /></SelectTrigger>
            <SelectContent>
              {leaveTypes.map((lt: any) => (
                <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests Table */}
      {requests.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-muted-foreground">
          {t('noRequests')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left">
                <th className="p-3 font-medium">{t('employee')}</th>
                <th className="p-3 font-medium">{tl('type')}</th>
                <th className="p-3 font-medium">{tl('startDate')}</th>
                <th className="p-3 font-medium">{tl('endDate')}</th>
                <th className="p-3 font-medium">{tl('duration')}</th>
                <th className="p-3 font-medium">{tl('status')}</th>
                <th className="p-3 font-medium">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                  <td className="p-3">{r.employee.firstName} {r.employee.lastName}</td>
                  <td className="p-3">{r.leaveType.name}</td>
                  <td className="p-3">{new Date(r.startDate).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(r.endDate).toLocaleDateString()}</td>
                  <td className="p-3">{r.durationDays}d</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      r.status === 'CANCELLED' ? 'bg-zinc-100 text-zinc-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {tl(`statuses.${r.status}`)}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link href={`/${locale}/manager/leaves/${r.id}`} className="text-sm text-blue-600 hover:underline">
                      {tc('view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/(hr)/manager/leaves/page.tsx src/app/[locale]/(hr)/manager/leaves/manager-leaves-client.tsx
git commit -m "feat: add manager leave requests page with filters"
```

---

### Task 13: Manager Approve/Reject Detail Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/leaves/[id]/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/leaves/[id]/manager-leave-action-client.tsx`

- [ ] **Step 1: Create server page**

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getLeaveRequestById } from '@/lib/queries/leave'
import ManagerLeaveActionClient from './manager-leave-action-client'

export default async function ManagerLeaveDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') redirect(`/${locale}/auth/signin`)

  const request = await getLeaveRequestById(id)
  if (!request) redirect(`/${locale}/manager/leaves`)

  return (
    <ManagerLeaveActionClient
      request={JSON.parse(JSON.stringify(request))}
      locale={locale}
    />
  )
}
```

Create `src/app/[locale]/(hr)/manager/leaves/[id]/manager-leave-action-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Check, X } from 'lucide-react'
import Link from 'next/link'
import { approveLeave, rejectLeave, cancelLeave } from '@/lib/actions/leave'

interface ManagerLeaveActionClientProps {
  request: any
  locale: string
}

export default function ManagerLeaveActionClient({ request, locale }: ManagerLeaveActionClientProps) {
  const t = useTranslations('managerLeaves')
  const tl = useTranslations('leave')
  const tc = useTranslations('common')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState('')

  async function handleApprove() {
    setActionLoading('approve')
    setError('')
    const formData = new FormData()
    formData.append('id', request.id)
    const result = await approveLeave(formData)
    if (result?.error) setError(result.error)
    setActionLoading(null)
  }

  async function handleReject() {
    if (!rejectReason) return
    setActionLoading('reject')
    setError('')
    const formData = new FormData()
    formData.append('id', request.id)
    formData.append('rejectReason', rejectReason)
    const result = await rejectLeave(formData)
    if (result?.error) setError(result.error)
    setActionLoading(null)
  }

  async function handleCancel() {
    setActionLoading('cancel')
    setError('')
    const formData = new FormData()
    formData.append('id', request.id)
    const result = await cancelLeave(formData)
    if (result?.error) setError(result.error)
    setActionLoading(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/manager/leaves`}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('employee')}</p>
              <p className="font-medium">{request.employee.firstName} {request.employee.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('type')}</p>
              <p className="font-medium">{request.leaveType.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('startDate')}</p>
              <p className="font-medium">{new Date(request.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('endDate')}</p>
              <p className="font-medium">{new Date(request.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('duration')}</p>
              <p className="font-medium">{request.durationDays} {tl('days')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('status')}</p>
              <p className="font-medium">{tl(`statuses.${request.status}`)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{tl('reason')}</p>
            <p className="mt-1">{request.reason}</p>
          </div>

          {request.attachmentFile && (
            <div>
              <p className="text-sm text-muted-foreground">{tl('attachment')}</p>
              <a href={request.attachmentFile} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                {tc('view')}
              </a>
            </div>
          )}

          {request.status === 'PENDING' && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <form action={handleApprove}>
                <Button type="submit" disabled={actionLoading !== null}>
                  {actionLoading === 'approve' ? tc('loading') : <><Check className="me-2 h-4 w-4" />{t('approve')}</>}
                </Button>
              </form>
              <Button variant="outline" onClick={() => setShowRejectForm(!showRejectForm)} disabled={actionLoading !== null}>
                <X className="me-2 h-4 w-4" />
                {t('reject')}
              </Button>
              <form action={handleCancel}>
                <Button variant="ghost" type="submit" disabled={actionLoading !== null} className="text-red-600">
                  {actionLoading === 'cancel' ? tc('loading') : t('cancel')}
                </Button>
              </form>
            </div>
          )}

          {request.status === 'APPROVED' && (
            <form action={handleCancel}>
              <Button variant="outline" type="submit" disabled={actionLoading !== null} className="text-red-600">
                {actionLoading === 'cancel' ? tc('loading') : t('cancel')}
              </Button>
            </form>
          )}

          {showRejectForm && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="rejectReason">{t('rejectionReasonPlaceholder')} *</Label>
              <textarea
                id="rejectReason"
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <form action={handleReject}>
                <Button variant="destructive" type="submit" disabled={!rejectReason || actionLoading !== null}>
                  {actionLoading === 'reject' ? tc('loading') : t('confirm')}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/(hr)/manager/leaves/\[id\]/
git commit -m "feat: add manager approve/reject leave detail page"
```

---

### Task 14: Manager Leave Calendar

**Files:**
- Create: `src/app/[locale]/(hr)/manager/leaves/calendar/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx`

- [ ] **Step 1: Create calendar server page**

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import CalendarClient from './calendar-client'

export default async function LeaveCalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') redirect(`/${locale}/auth/signin`)

  const requests = await db.leaveRequest.findMany({
    where: { status: 'APPROVED' },
    include: {
      leaveType: true,
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  return <CalendarClient requests={JSON.parse(JSON.stringify(requests))} locale={locale} />
}
```

Create `src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarClientProps {
  requests: any[]
  locale: string
}

export default function CalendarClient({ requests }: CalendarClientProps) {
  const t = useTranslations('managerLeaves')
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function getRequestsForDay(day: number) {
    return requests.filter((r: any) => {
      const start = new Date(r.startDate)
      const end = new Date(r.endDate)
      const date = new Date(year, month, day)
      return date >= start && date <= end
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('calendar')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center font-medium">{monthNames[month]} {year}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="grid grid-cols-7 border-b">
          {dayNames.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-24 border-b border-r p-1" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayRequests = getRequestsForDay(day)
            return (
              <div key={day} className="min-h-24 border-b border-r p-1">
                <p className="text-xs font-medium">{day}</p>
                <div className="mt-1 space-y-0.5">
                  {dayRequests.map((r: any) => (
                    <div
                      key={r.id}
                      className="truncate rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-700"
                      title={`${r.employee.firstName} ${r.employee.lastName} - ${r.leaveType.name}`}
                    >
                      {r.employee.firstName}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/(hr)/manager/leaves/calendar/
git commit -m "feat: add manager leave calendar view"
```

---

### Task 15: Manager Leave Types Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/leave-types/page.tsx`

- [ ] **Step 1: Create leave types management page**

```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllLeaveTypes, getEmployeeLeaveBalances, getEmployees } from '@/lib/queries/leave'
import { db } from '@/lib/db'
import LeaveTypesClient from './leave-types-client'

export default async function LeaveTypesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') redirect(`/${locale}/auth/signin`)

  const [leaveTypes, employees] = await Promise.all([
    getAllLeaveTypes(),
    getEmployees(),
  ])

  const employeeBalances = await Promise.all(
    employees.map(async (emp) => {
      const balances = await getEmployeeLeaveBalances(emp.id)
      return { employeeId: emp.id, balances }
    })
  )

  return (
    <LeaveTypesClient
      leaveTypes={JSON.parse(JSON.stringify(leaveTypes))}
      employees={JSON.parse(JSON.stringify(employees))}
      employeeBalances={JSON.parse(JSON.stringify(employeeBalances))}
      locale={locale}
    />
  )
}
```

Create `src/app/[locale]/(hr)/manager/leave-types/leave-types-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setAllocation } from '@/lib/actions/leave'
import { Pencil } from 'lucide-react'

interface LeaveTypesClientProps {
  leaveTypes: any[]
  employees: { id: string; firstName: string; lastName: string }[]
  employeeBalances: { employeeId: string; balances: any[] }[]
  locale: string
}

export default function LeaveTypesClient({ leaveTypes, employees, employeeBalances, locale }: LeaveTypesClientProps) {
  const t = useTranslations('leaveTypes')
  const tl = useTranslations('leave')
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [allocationValue, setAllocationValue] = useState('')
  const [saving, setSaving] = useState(false)

  function getBalance(employeeId: string, leaveTypeId: string) {
    const eb = employeeBalances.find((b) => b.employeeId === employeeId)
    if (!eb) return null
    return eb.balances.find((b) => b.leaveTypeId === leaveTypeId)
  }

  async function handleSave() {
    if (!editingEmployee || !editingType || !allocationValue) return
    setSaving(true)
    const formData = new FormData()
    formData.append('employeeId', editingEmployee)
    formData.append('leaveTypeId', editingType)
    formData.append('allocated', allocationValue)
    await setAllocation(formData)
    setSaving(false)
    setEditingEmployee(null)
    setEditingType(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="p-3 font-medium">{t('employee')}</th>
              {leaveTypes.map((lt: any) => (
                <th key={lt.id} className="p-3 font-medium text-center">{lt.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b last:border-0 hover:bg-zinc-50">
                <td className="p-3 font-medium">{emp.firstName} {emp.lastName}</td>
                {leaveTypes.map((lt: any) => {
                  const balance = getBalance(emp.id, lt.id)
                  const remaining = balance ? balance.allocated + balance.carriedOver - balance.used : lt.defaultDays
                  const isEditing = editingEmployee === emp.id && editingType === lt.id
                  return (
                    <td key={lt.id} className="p-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            className="h-7 w-16 text-center"
                            value={allocationValue}
                            onChange={(e) => setAllocationValue(e.target.value)}
                          />
                          <Button size="xs" onClick={handleSave} disabled={saving}>
                            {t('save')}
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingEmployee(emp.id)
                            setEditingType(lt.id)
                            setAllocationValue(String(remaining))
                          }}
                          className="inline-flex items-center gap-1 text-sm hover:text-blue-600"
                        >
                          {remaining}
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/(hr)/manager/leave-types/
git commit -m "feat: add manager leave types page with allocation editing"
```

---

### Task 16: Build & Verify

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: Compiled successfully, zero errors.

- [ ] **Step 2: Fix any type errors**

If errors appear, fix them and re-run until clean.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: fix build errors for leave management"
```

---

## File Map Summary

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add LeaveType, LeaveBalance, LeaveRequest models |
| `prisma/seed.ts` | Seed 8 leave types |
| `src/lib/validations/leave.ts` | Zod schemas for all leave operations |
| `src/lib/queries/leave.ts` | DB query functions for leave data access |
| `src/lib/upload.ts` | File upload utility for leave attachments |
| `src/lib/actions/leave.ts` | Server actions: submit, approve, reject, cancel, set allocation |
| `src/i18n/messages/en.json` | Leave translation keys (EN) |
| `src/i18n/messages/ar.json` | Leave translation keys (AR) |
| `src/components/layout/sidebar.tsx` | Role-aware sidebar with leave links |
| `src/app/[locale]/(hr)/layout.tsx` | Pass role prop to sidebar |
| `src/app/[locale]/(hr)/leave/page.tsx` | Employee: own requests + balances |
| `src/app/[locale]/(hr)/leave/leave-client.tsx` | Client component for leave list |
| `src/app/[locale]/(hr)/leave/new/page.tsx` | Server wrapper for submit form |
| `src/app/[locale]/(hr)/leave/new/submit-leave-form.tsx` | Leave submit form client component |
| `src/app/[locale]/(hr)/leave/[id]/page.tsx` | Leave detail server wrapper |
| `src/app/[locale]/(hr)/leave/[id]/leave-detail-client.tsx` | Leave detail client component |
| `src/app/[locale]/(hr)/manager/leaves/page.tsx` | Manager: all requests table |
| `src/app/[locale]/(hr)/manager/leaves/manager-leaves-client.tsx` | Manager requests client component |
| `src/app/[locale]/(hr)/manager/leaves/[id]/page.tsx` | Manager approve/reject server wrapper |
| `src/app/[locale]/(hr)/manager/leaves/[id]/manager-leave-action-client.tsx` | Manager approve/reject client component |
| `src/app/[locale]/(hr)/manager/leaves/calendar/page.tsx` | Calendar server wrapper |
| `src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx` | Calendar client component |
| `src/app/[locale]/(hr)/manager/leave-types/page.tsx` | Leave types server wrapper |
| `src/app/[locale]/(hr)/manager/leave-types/leave-types-client.tsx` | Leave types client component |
