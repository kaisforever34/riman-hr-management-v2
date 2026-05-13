# Phase 4 — Payroll Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monthly payroll processing with auto-calculated payslips, manager review, and finalization.

**Architecture:** PayrollPeriod + Payslip models in Prisma; server actions for create/recalculate/finalize/update; manager UI for processing months, editing late deductions, and viewing payslips.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma v5, PostgreSQL, Tailwind v4, shadcn/ui base-nova, next-intl, Zod, date-fns, lucide-react

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `AppSetting`, `PayrollPeriod`, `Payslip` models |
| `src/lib/validations/payroll.ts` | Create | Zod schemas for payroll actions |
| `src/lib/queries/payroll.ts` | Create | DB query functions for payroll |
| `src/lib/actions/payroll.ts` | Create | Server actions (create, recalculate, finalize, update) |
| `src/i18n/messages/en.json` | Modify | Add `payroll` + `managerPayroll` keys + `nav.payroll` |
| `src/i18n/messages/ar.json` | Modify | Add `payroll` + `managerPayroll` keys + `nav.payroll` |
| `src/app/[locale]/(hr)/manager/payroll/page.tsx` | Create | Payroll period list page |
| `src/app/[locale]/(hr)/manager/payroll/new/page.tsx` | Create | New period form |
| `src/app/[locale]/(hr)/manager/payroll/[id]/page.tsx` | Create | Period detail / payslip editor |
| `src/app/[locale]/(hr)/manager/payroll/[id]/period-client.tsx` | Create | Period detail client component |
| `src/app/[locale]/(hr)/manager/payroll/[id]/[employeeId]/page.tsx` | Create | Individual payslip view |
| `src/components/layout/sidebar.tsx` | Modify | Enable payroll sidebar link |

---

### Task 1: Add Payroll Models + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Run migration

- [ ] **Step 1: Add PayrollPeriod, Payslip, and AppSetting models**

Add to `prisma/schema.prisma` after `model AttendanceRecord {` block and before `model Account {`:

```prisma
model AppSetting {
  id    String @id @default(cuid())
  key   String @unique
  value String
}

model PayrollPeriod {
  id            String    @id @default(cuid())
  month         Int
  year          Int
  status        String    @default("DRAFT")
  processedAt   DateTime?
  processedById String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  processedBy User?     @relation(fields: [processedById], references: [id])
  payslips    Payslip[]

  @@unique([month, year])
}

model Payslip {
  id                    String   @id @default(cuid())
  payrollPeriodId       String
  employeeId            String
  basicSalary           Decimal  @db.Decimal(10, 2)
  transportationDeduction Decimal @default(0) @db.Decimal(10, 2)
  absenceDeduction      Decimal  @default(0) @db.Decimal(10, 2)
  lateDeduction         Decimal  @default(0) @db.Decimal(10, 2)
  netPay                Decimal  @db.Decimal(10, 2)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  payrollPeriod PayrollPeriod @relation(fields: [payrollPeriodId], references: [id], onDelete: Cascade)
  employee      Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@unique([payrollPeriodId, employeeId])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_payroll_models --create-only && npx prisma generate
```

Expected: Migration created and client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add PayrollPeriod, Payslip, AppSetting models"
```

---

### Task 2: Zod Validation Schemas

**Files:**
- Create: `src/lib/validations/payroll.ts`

- [ ] **Step 1: Create payroll Zod schemas**

Create `src/lib/validations/payroll.ts`:

```typescript
import { z } from 'zod'

export const createPayrollPeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2099),
})

export const updateLateDeductionSchema = z.object({
  payslipId: z.string().min(1),
  lateDeduction: z.coerce.number().min(0),
})
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/payroll.ts
git commit -m "feat: add payroll validation schemas"
```

---

### Task 3: DB Queries for Payroll

**Files:**
- Create: `src/lib/queries/payroll.ts`

- [ ] **Step 1: Create payroll query functions**

Create `src/lib/queries/payroll.ts`:

```typescript
import { db } from '@/lib/db'
import { startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export async function getPayrollPeriods() {
  return db.payrollPeriod.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      _count: { select: { payslips: true } },
    },
  })
}

export async function getPayrollPeriod(id: string) {
  return db.payrollPeriod.findUnique({
    where: { id },
    include: {
      payslips: {
        include: {
          employee: { select: { firstName: true, lastName: true, department: true } },
        },
        orderBy: { employeeId: 'asc' },
      },
    },
  })
}

export async function getPayslip(id: string) {
  return db.payslip.findUnique({
    where: { id },
    include: {
      payrollPeriod: true,
      employee: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
          jobTitle: true,
          salary: true,
        },
      },
    },
  })
}

export async function getAnnualLeaveDaysInPeriod(employeeId: string, start: Date, end: Date): Promise<number> {
  const annualLeaveType = await db.leaveType.findUnique({ where: { name: 'Annual' } })
  if (!annualLeaveType) return 0

  const requests = await db.leaveRequest.findMany({
    where: {
      employeeId,
      leaveTypeId: annualLeaveType.id,
      status: 'APPROVED',
      startDate: { lte: end },
      endDate: { gte: start },
    },
  })

  if (requests.length === 0) return 0

  const daysInRange = new Set<string>()
  for (const req of requests) {
    const reqStart = req.startDate > start ? req.startDate : start
    const reqEnd = req.endDate < end ? req.endDate : end
    const days = eachDayOfInterval({ start: reqStart, end: reqEnd })
    for (const d of days) {
      daysInRange.add(d.toISOString().split('T')[0])
    }
  }

  // Sum durationDays for leave requests overlapping this period (pro-rated)
  let totalDays = 0
  for (const req of requests) {
    const overlapStart = req.startDate > start ? req.startDate : start
    const overlapEnd = req.endDate < end ? req.endDate : end
    const overlapDays = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const requestDays = Math.floor((req.endDate.getTime() - req.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    totalDays += (req.durationDays / requestDays) * overlapDays
  }

  return Math.round(totalDays)
}

export async function getAbsentDaysInPeriod(employeeId: string, start: Date, end: Date): Promise<number> {
  return db.attendanceRecord.count({
    where: {
      employeeId,
      date: { gte: start, lte: end },
      status: 'ABSENT',
    },
  })
}

export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await db.appSetting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function getActiveEmployeesForPayroll() {
  return db.employee.findMany({
    where: { isActive: true, salary: { gt: 0 } },
    orderBy: { firstName: 'asc' },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queries/payroll.ts
git commit -m "feat: add payroll query functions"
```

---

### Task 4: Server Actions for Payroll

**Files:**
- Create: `src/lib/actions/payroll.ts`

- [ ] **Step 1: Create payroll server actions**

Create `src/lib/actions/payroll.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { createPayrollPeriodSchema, updateLateDeductionSchema } from '@/lib/validations/payroll'
import { auth } from '@/lib/auth'
import { getAnnualLeaveDaysInPeriod, getAbsentDaysInPeriod, getAppSetting, getActiveEmployeesForPayroll } from '@/lib/queries/payroll'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { startOfMonth, endOfMonth, differenceInDays, addDays } from 'date-fns'

const DAILY_RATE_DIVISOR = 30
const DEFAULT_TRANSPORTATION = 500

async function getTransportationAmount(): Promise<number> {
  const val = await getAppSetting('TRANSPORTATION_AMOUNT')
  return val ? parseInt(val, 10) : DEFAULT_TRANSPORTATION
}

export async function createPayrollPeriod(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = createPayrollPeriodSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid month or year' }

  const { month, year } = parsed.data

  const existing = await db.payrollPeriod.findUnique({
    where: { month_year: { month, year } },
  })
  if (existing) return { error: 'Payroll period already exists for this month' }

  const periodStart = startOfMonth(new Date(year, month - 1))
  const periodEnd = endOfMonth(periodStart)
  const employees = await getActiveEmployeesForPayroll()
  const transportationAmount = await getTransportationAmount()

  if (employees.length === 0) return { error: 'No active employees with salary' }

  const period = await db.payrollPeriod.create({
    data: { month, year, status: 'DRAFT' },
  })

  for (const emp of employees) {
    const annualLeaveDays = await getAnnualLeaveDaysInPeriod(emp.id, periodStart, periodEnd)
    const absentDays = await getAbsentDaysInPeriod(emp.id, periodStart, periodEnd)
    const salary = Number(emp.salary)
    const dailyRate = salary / DAILY_RATE_DIVISOR
    const transportDeduction = (transportationAmount / DAILY_RATE_DIVISOR) * annualLeaveDays
    const absenceDeduction = dailyRate * absentDays

    await db.payslip.create({
      data: {
        payrollPeriodId: period.id,
        employeeId: emp.id,
        basicSalary: salary,
        transportationDeduction: Math.round(transportDeduction * 100) / 100,
        absenceDeduction: Math.round(absenceDeduction * 100) / 100,
        lateDeduction: 0,
        netPay: salary - Math.round(transportDeduction * 100) / 100 - Math.round(absenceDeduction * 100) / 100,
      },
    })
  }

  revalidatePath('/manager/payroll')
  redirect(`/manager/payroll/${period.id}`)
}

export async function recalculatePayslips(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const periodId = formData.get('periodId') as string
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
  if (!period || period.status !== 'DRAFT') return { error: 'Period not found or already finalized' }

  const periodStart = startOfMonth(new Date(period.year, period.month - 1))
  const periodEnd = endOfMonth(periodStart)
  const existingPayslips = await db.payslip.findMany({ where: { payrollPeriodId: periodId } })
  const transportationAmount = await getTransportationAmount()

  for (const slip of existingPayslips) {
    const annualLeaveDays = await getAnnualLeaveDaysInPeriod(slip.employeeId, periodStart, periodEnd)
    const absentDays = await getAbsentDaysInPeriod(slip.employeeId, periodStart, periodEnd)
    const salary = Number(slip.basicSalary)
    const dailyRate = salary / DAILY_RATE_DIVISOR
    const transportDeduction = (transportationAmount / DAILY_RATE_DIVISOR) * annualLeaveDays
    const absenceDeduction = dailyRate * absentDays

    await db.payslip.update({
      where: { id: slip.id },
      data: {
        transportationDeduction: Math.round(transportDeduction * 100) / 100,
        absenceDeduction: Math.round(absenceDeduction * 100) / 100,
        netPay: salary - Math.round(transportDeduction * 100) / 100 - Math.round(absenceDeduction * 100) / 100 - Number(slip.lateDeduction),
      },
    })
  }

  revalidatePath(`/manager/payroll/${periodId}`)
}

export async function updateLateDeduction(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = updateLateDeductionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid deduction amount' }

  const slip = await db.payslip.findUnique({
    where: { id: parsed.data.payslipId },
    include: { payrollPeriod: true },
  })
  if (!slip || slip.payrollPeriod.status !== 'DRAFT') return { error: 'Cannot modify finalized payslip' }

  const lateDeduction = parsed.data.lateDeduction
  const basicSalary = Number(slip.basicSalary)
  if (lateDeduction > basicSalary) return { error: 'Late deduction cannot exceed basic salary' }

  const netPay = basicSalary - Number(slip.transportationDeduction) - Number(slip.absenceDeduction) - lateDeduction

  await db.payslip.update({
    where: { id: slip.id },
    data: { lateDeduction, netPay: Math.round(netPay * 100) / 100 },
  })

  revalidatePath(`/manager/payroll/${slip.payrollPeriodId}`)
}

export async function finalizePayroll(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const periodId = formData.get('periodId') as string
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
  if (!period || period.status !== 'DRAFT') return { error: 'Period not found or already finalized' }

  await db.payrollPeriod.update({
    where: { id: periodId },
    data: { status: 'FINALIZED', processedAt: new Date(), processedById: session.user.id },
  })

  revalidatePath('/manager/payroll')
  revalidatePath(`/manager/payroll/${periodId}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/payroll.ts
git commit -m "feat: add payroll server actions"
```

---

### Task 5: i18n Keys for Payroll

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/ar.json`

- [ ] **Step 1: Add payroll keys to en.json**

Update the `nav` block to add `payroll`:

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

Add after the `managerAttendance` block:

```json
  "payroll": {
    "title": "Payroll",
    "periods": "Payroll Periods",
    "newPeriod": "New Payroll Period",
    "selectMonth": "Select Month",
    "selectYear": "Select Year",
    "process": "Process Month",
    "processing": "Processing...",
    "status": "Status",
    "draft": "Draft",
    "finalized": "Finalized",
    "employees": "Employees",
    "totalNetPay": "Total Net Pay",
    "noPeriods": "No payroll periods yet",
    "noPeriodsDesc": "Process your first payroll month to get started.",
    "periodExists": "Payroll period already exists for this month",
    "noEmployees": "No active employees with salary",
    "success": {
      "created": "Payroll period created",
      "finalized": "Payroll finalized"
    },
    "errors": {
      "createFailed": "Failed to create payroll period",
      "finalizeFailed": "Failed to finalize payroll",
      "recalculateFailed": "Failed to recalculate"
    }
  },
  "managerPayroll": {
    "title": "Payroll Period",
    "recalculate": "Recalculate from Attendance",
    "finalize": "Finalize",
    "finalizeConfirm": "Are you sure? This will lock all payslips.",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "employee": "Employee",
    "department": "Department",
    "basicSalary": "Basic Salary",
    "transportDeduction": "Transport Deduction",
    "absenceDeduction": "Absence Deduction",
    "lateDeduction": "Late Deduction",
    "netPay": "Net Pay",
    "editLateDeduction": "Edit Late Deduction",
    "saveLateDeduction": "Save",
    "payslipDetail": "Payslip Detail",
    "period": "Period",
    "jobTitle": "Job Title",
    "summary": "Summary",
    "totalDeductions": "Total Deductions",
    "total": "Total",
    "noPayslips": "No payslips for this period"
  },
```

- [ ] **Step 2: Add Arabic keys to ar.json**

Update the `nav` block:

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

Add after the `managerAttendance` block:

```json
  "payroll": {
    "title": "الرواتب",
    "periods": "فترات الرواتب",
    "newPeriod": "فترة رواتب جديدة",
    "selectMonth": "اختر الشهر",
    "selectYear": "اختر السنة",
    "process": "معالجة الشهر",
    "processing": "جاري المعالجة...",
    "status": "الحالة",
    "draft": "مسودة",
    "finalized": "مؤكدة",
    "employees": "الموظفين",
    "totalNetPay": "إجمالي صافي الراتب",
    "noPeriods": "لا توجد فترات رواتب بعد",
    "noPeriodsDesc": "قم بمعالجة أول شهر رواتب للبدء.",
    "periodExists": "فترة الرواتب لهذا الشهر موجودة بالفعل",
    "noEmployees": "لا يوجد موظفين نشطين براتب",
    "success": {
      "created": "تم إنشاء فترة الرواتب",
      "finalized": "تم تأكيد الرواتب"
    },
    "errors": {
      "createFailed": "فشل إنشاء فترة الرواتب",
      "finalizeFailed": "فشل تأكيد الرواتب",
      "recalculateFailed": "فشل إعادة الحساب"
    }
  },
  "managerPayroll": {
    "title": "فترة الرواتب",
    "recalculate": "إعادة الحساب من الحضور",
    "finalize": "تأكيد",
    "finalizeConfirm": "هل أنت متأكد؟ سيؤدي هذا إلى قفل جميع قسائم الرواتب.",
    "confirm": "تأكيد",
    "cancel": "إلغاء",
    "employee": "الموظف",
    "department": "القسم",
    "basicSalary": "الراتب الأساسي",
    "transportDeduction": "خصم المواصلات",
    "absenceDeduction": "خصم الغياب",
    "lateDeduction": "خصم التأخير",
    "netPay": "صافي الراتب",
    "editLateDeduction": "تعديل خصم التأخير",
    "saveLateDeduction": "حفظ",
    "payslipDetail": "تفاصيل قسيمة الراتب",
    "period": "الفترة",
    "jobTitle": "المسمى الوظيفي",
    "summary": "الملخص",
    "totalDeductions": "إجمالي الخصومات",
    "total": "الإجمالي",
    "noPayslips": "لا توجد قسائم رواتب لهذه الفترة"
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: add payroll i18n keys for EN and AR"
```

---

### Task 6: Payroll Period List Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/payroll/page.tsx`

- [ ] **Step 1: Create period list page**

Create `src/app/[locale]/(hr)/manager/payroll/page.tsx`:

```typescript
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getPayrollPeriods } from '@/lib/queries/payroll'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PayrollPage() {
  const t = await getTranslations('payroll')
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const periods = await getPayrollPeriods()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href="/manager/payroll/new" className={buttonVariants()}>
          <Plus className="me-2 h-4 w-4" />
          {t('newPeriod')}
        </Link>
      </div>

      {periods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="text-lg font-medium">{t('noPeriods')}</h3>
            <p className="text-sm text-zinc-500">{t('noPeriodsDesc')}</p>
            <Link
              href="/manager/payroll/new"
              className={buttonVariants({ className: 'mt-4' })}
            >
              <Plus className="me-2 h-4 w-4" />
              {t('newPeriod')}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-zinc-50">
                    <th className="px-4 py-3 text-start font-medium">{t('periods')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('employees')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('totalNetPay')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {periods.map(p => {
                    const monthName = format(new Date(p.year, p.month - 1), 'MMMM yyyy')
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium">{monthName}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                            p.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700',
                          )}>
                            {p.status === 'DRAFT' ? t('draft') : t('finalized')}
                          </span>
                        </td>
                        <td className="px-4 py-3">{p._count.payslips}</td>
                        <td className="px-4 py-3">--</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/manager/payroll/${p.id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          >
                            <FileText className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/\(hr\)/manager/payroll/page.tsx
git commit -m "feat: add payroll period list page"
```

---

### Task 7: New Payroll Period Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/payroll/new/page.tsx`

- [ ] **Step 1: Create new period form**

Create `src/app/[locale]/(hr)/manager/payroll/new/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createPayrollPeriod } from '@/lib/actions/payroll'
import { useRouter } from 'next/navigation'

export default function NewPayrollPeriodPage() {
  const t = useTranslations('payroll')
  const router = useRouter()
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const form = new FormData()
    form.set('month', String(month))
    form.set('year', String(year))
    const result = await createPayrollPeriod(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // If no error, redirect happens in server action
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('newPeriod')}</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t('selectMonth')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="text-xs font-medium text-zinc-500">{t('selectMonth')}</label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">{t('selectYear')}</label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {[year - 1, year, year + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? t('processing') : t('process')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/\(hr\)/manager/payroll/new/page.tsx
git commit -m "feat: add new payroll period form"
```

---

### Task 8: Period Detail / Payslip Editor Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/payroll/[id]/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/payroll/[id]/period-client.tsx`

- [ ] **Step 1: Create server component**

Create `src/app/[locale]/(hr)/manager/payroll/[id]/page.tsx`:

```typescript
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getPayrollPeriod } from '@/lib/queries/payroll'
import { PeriodClient } from './period-client'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const period = await getPayrollPeriod(id)
  if (!period) return notFound()

  return (
    <PeriodClient
      period={{
        id: period.id,
        month: period.month,
        year: period.year,
        status: period.status,
      }}
      payslips={period.payslips.map(s => ({
        id: s.id,
        employeeId: s.employeeId,
        employeeName: `${s.employee.firstName} ${s.employee.lastName}`,
        department: s.employee.department,
        basicSalary: Number(s.basicSalary),
        transportationDeduction: Number(s.transportationDeduction),
        absenceDeduction: Number(s.absenceDeduction),
        lateDeduction: Number(s.lateDeduction),
        netPay: Number(s.netPay),
      }))}
    />
  )
}
```

- [ ] **Step 2: Create client component**

Create `src/app/[locale]/(hr)/manager/payroll/[id]/period-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { recalculatePayslips, updateLateDeduction, finalizePayroll } from '@/lib/actions/payroll'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface PayslipData {
  id: string
  employeeId: string
  employeeName: string
  department: string
  basicSalary: number
  transportationDeduction: number
  absenceDeduction: number
  lateDeduction: number
  netPay: number
}

interface Props {
  period: { id: string; month: number; year: number; status: string }
  payslips: PayslipData[]
}

export function PeriodClient({ period, payslips }: Props) {
  const t = useTranslations('managerPayroll')
  const tp = useTranslations('payroll')
  const router = useRouter()
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showFinalize, setShowFinalize] = useState(false)
  const isDraft = period.status === 'DRAFT'

  const handleRecalculate = async () => {
    setLoading('recalculate')
    setMessage('')
    const form = new FormData()
    form.set('periodId', period.id)
    const result = await recalculatePayslips(form)
    if (result?.error) setMessage(result.error)
    setLoading('')
  }

  const handleFinalize = async () => {
    setLoading('finalize')
    setMessage('')
    const form = new FormData()
    form.set('periodId', period.id)
    const result = await finalizePayroll(form)
    if (result?.error) {
      setMessage(result.error)
    }
    setLoading('')
    setShowFinalize(false)
  }

  const handleSaveLateDeduction = async (payslipId: string) => {
    setLoading(payslipId)
    setMessage('')
    const form = new FormData()
    form.set('payslipId', payslipId)
    form.set('lateDeduction', editValue)
    const result = await updateLateDeduction(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setEditingId(null)
    }
    setLoading('')
  }

  const monthName = format(new Date(period.year, period.month - 1), 'MMMM yyyy')
  const totalNetPay = payslips.reduce((sum, s) => sum + s.netPay, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{monthName}</h1>
          <span className={cn(
            'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
            isDraft ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700',
          )}>
            {isDraft ? tp('draft') : tp('finalized')}
          </span>
        </div>
        {isDraft && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRecalculate} disabled={loading === 'recalculate'}>
              {loading === 'recalculate' ? '...' : t('recalculate')}
            </Button>
            <Button onClick={() => setShowFinalize(true)}>
              {t('finalize')}
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', message.includes('Failed') || message.includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
          {message}
        </div>
      )}

      {showFinalize && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <p className="mb-3 text-sm">{t('finalizeConfirm')}</p>
            <div className="flex gap-2">
              <Button onClick={handleFinalize} disabled={loading === 'finalize'}>
                {loading === 'finalize' ? '...' : t('confirm')}
              </Button>
              <Button variant="outline" onClick={() => setShowFinalize(false)}>{t('cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('department')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('basicSalary')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('transportDeduction')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('absenceDeduction')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('lateDeduction')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('netPay')}</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(slip => (
                  <tr key={slip.id} className="border-b last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">{slip.employeeName}</td>
                    <td className="px-4 py-3 text-zinc-500">{slip.department}</td>
                    <td className="px-4 py-3 text-end">{slip.basicSalary.toFixed(2)}</td>
                    <td className="px-4 py-3 text-end text-red-600">{slip.transportationDeduction > 0 ? `-${slip.transportationDeduction.toFixed(2)}` : '0.00'}</td>
                    <td className="px-4 py-3 text-end text-red-600">{slip.absenceDeduction > 0 ? `-${slip.absenceDeduction.toFixed(2)}` : '0.00'}</td>
                    <td className="px-4 py-3 text-end">
                      {editingId === slip.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            className="w-20 rounded border px-2 py-1 text-end text-sm"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            min="0"
                            step="0.01"
                          />
                          <Button size="sm" onClick={() => handleSaveLateDeduction(slip.id)} disabled={loading === slip.id}>
                            {t('saveLateDeduction')}
                          </Button>
                        </span>
                      ) : (
                        <span
                          className={cn('cursor-pointer', isDraft && 'hover:text-blue-600')}
                          onClick={() => {
                            if (!isDraft) return
                            setEditingId(slip.id)
                            setEditValue(String(slip.lateDeduction))
                          }}
                        >
                          {slip.lateDeduction > 0 ? `-${slip.lateDeduction.toFixed(2)}` : '0.00'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end font-medium">{slip.netPay.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-zinc-50 font-medium">
                  <td className="px-4 py-3" colSpan={2}>{t('total')}</td>
                  <td className="px-4 py-3 text-end">{payslips.reduce((s, p) => s + p.basicSalary, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-end text-red-600">{payslips.reduce((s, p) => s + p.transportationDeduction, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-end text-red-600">{payslips.reduce((s, p) => s + p.absenceDeduction, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-end text-red-600">{payslips.reduce((s, p) => s + p.lateDeduction, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-end">{totalNetPay.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

Wait — the existing codebase uses `t('total')` which doesn't exist in `managerPayroll` namespace. Let me fix: these references should use `common` namespace for `total` or add it to the i18n keys. Actually, `t('total')` is used in the table footer. Let me use `tp('totalNetPay')` as label for totals or just hardcode "Total". Better to add `total` to the `managerPayroll` namespace.

Let me update the i18n keys to include `"total": "Total"` in the `managerPayroll` namespace.

Actually, looking at it more carefully, the `total` key already exists in `common` namespace. But in the client component I'm using `t` which is `managerPayroll`. Let me either add `total` to `managerPayroll` or use `tc` from `common`.

For simplicity: add `"total": "Total"` to the `managerPayroll` EN and AR keys.

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/\(hr\)/manager/payroll/\[id\]/
git commit -m "feat: add payroll period detail page with payslip editor"
```

---

### Task 9: Individual Payslip View Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/payroll/[id]/[employeeId]/page.tsx`

- [ ] **Step 1: Create payslip detail page**

Create `src/app/[locale]/(hr)/manager/payroll/[id]/[employeeId]/page.tsx`:

```typescript
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PayslipDetailPage({ params }: { params: Promise<{ id: string; employeeId: string }> }) {
  const { id, employeeId } = await params
  const t = await getTranslations('managerPayroll')
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const payslip = await db.payslip.findFirst({
    where: { payrollPeriodId: id, employeeId },
    include: {
      payrollPeriod: true,
      employee: { select: { firstName: true, lastName: true, department: true, jobTitle: true, salary: true } },
    },
  })
  if (!payslip) return notFound()

  const monthName = format(new Date(payslip.payrollPeriod.year, payslip.payrollPeriod.month - 1), 'MMMM yyyy')

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/manager/payroll/${id}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('title')}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{payslip.employee.firstName} {payslip.employee.lastName}</CardTitle>
          <p className="text-sm text-zinc-500">{payslip.employee.department} — {payslip.employee.jobTitle}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between border-b py-2">
              <span>{t('period')}</span>
              <span className="font-medium">{monthName}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span>{t('basicSalary')}</span>
              <span className="font-medium">{Number(payslip.basicSalary).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-red-600">
              <span>{t('transportDeduction')}</span>
              <span>{Number(payslip.transportationDeduction) > 0 ? `-${Number(payslip.transportationDeduction).toFixed(2)}` : '0.00'}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-red-600">
              <span>{t('absenceDeduction')}</span>
              <span>{Number(payslip.absenceDeduction) > 0 ? `-${Number(payslip.absenceDeduction).toFixed(2)}` : '0.00'}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-red-600">
              <span>{t('lateDeduction')}</span>
              <span>{Number(payslip.lateDeduction) > 0 ? `-${Number(payslip.lateDeduction).toFixed(2)}` : '0.00'}</span>
            </div>
            <div className="flex justify-between py-2 text-lg font-bold">
              <span>{t('netPay')}</span>
              <span>{Number(payslip.netPay).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/\(hr\)/manager/payroll/\[id\]/\[employeeId\]/page.tsx
git commit -m "feat: add individual payslip view page"
```

---

### Task 10: Sidebar Update

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Enable payroll sidebar link**

In `src/components/layout/sidebar.tsx`, change:

```typescript
    { href: '/payroll', icon: Banknote, label: 'payroll', show: false },
```

To:

```typescript
    { href: '/manager/payroll', icon: Banknote, label: 'payroll', show: role === 'MANAGER' },
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: enable payroll sidebar link for manager"
```

---

## Self-Review

### Spec Coverage
- **PayrollPeriod + Payslip models** → Task 1
- **Auto-calculation from salary** → Task 4 (`createPayrollPeriod` calculates from salary)
- **Transportation deduction (annual leave)** → Task 3 (`getAnnualLeaveDaysInPeriod`), Task 4
- **Absence deduction** → Task 3 (`getAbsentDaysInPeriod`), Task 4
- **Late deduction (manager-set)** → Task 4 (`updateLateDeduction`), Task 8 UI
- **Payslip with full breakdown** → Tasks 8, 9 (table + individual view)
- **Recalculate button** → Task 4 (`recalculatePayslips`), Task 8 UI
- **Finalize flow** → Task 4 (`finalizePayroll`), Task 8 UI with confirm dialog
- **i18n** → Task 5
- **Sidebar** → Task 10
- **Validation** → Task 2 (Zod schemas for create + update)
- **AppSetting for TRANSPORTATION_AMOUNT** → Task 1 (model), Task 3 (query), Task 4 (usage)

### Placeholder Check
- All code blocks complete. No TBD, TODO, or vague steps.
- All file paths exact.

### Type Consistency
- `PayrollPeriod.month` (Int, 1-12) used consistently
- `Payslip` Decimal fields match between schema, queries, and UI
- `createPayrollPeriodSchema` validates month/year, same as migration
- `updateLateDeductionSchema` validates `payslipId` + `lateDeduction`

### Issues Fixed During Self-Review
- `total` key added to `managerPayroll` namespace for table footer
- `period-client.tsx` `t` function now references `managerPayroll`, `tp` for `payroll`
- Table footer uses `t('total')` + computed sum columns
