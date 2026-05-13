# Phase 6 — Performance Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quarterly performance reviews with descriptive ratings, goals/action plans, and bonus recommendations linked to payroll.

**Architecture:** Four Prisma models (ReviewCriteria, PerformanceReview, ReviewRating, ReviewGoal); seed script populates base criteria; server actions for create/delete; three manager pages (list, new review, detail); payroll integration shows bonus recommendation on payslip.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma v5, PostgreSQL, Tailwind v4, shadcn/ui base-nova, next-intl, Zod, lucide-react

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add ReviewCriteria, PerformanceReview, ReviewRating, ReviewGoal models |
| `prisma/seed.ts` | Modify | Seed base ReviewCriteria |
| `src/lib/validations/performance.ts` | Create | Zod schemas for review actions |
| `src/lib/queries/performance.ts` | Create | Query functions for reviews |
| `src/lib/actions/performance.ts` | Create | Server actions (createReview, deleteReview) |
| `src/i18n/messages/en.json` | Modify | Add `performance` keys + `nav.performance` |
| `src/i18n/messages/ar.json` | Modify | Add `performance` keys + `nav.performance` |
| `src/app/[locale]/(hr)/manager/performance/page.tsx` | Create | Reviews list server component |
| `src/app/[locale]/(hr)/manager/performance/performance-client.tsx` | Create | Reviews list client component |
| `src/app/[locale]/(hr)/manager/performance/new/page.tsx` | Create | New review server component |
| `src/app/[locale]/(hr)/manager/performance/new/new-review-client.tsx` | Create | New review client form component |
| `src/app/[locale]/(hr)/manager/performance/[id]/page.tsx` | Create | Review detail server component |
| `src/app/[locale]/(hr)/manager/performance/[id]/review-detail-client.tsx` | Create | Review detail client component |
| `src/components/layout/sidebar.tsx` | Modify | Enable performance sidebar link |

---

### Task 1: Add Performance Models + Migration + Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Run migration

- [ ] **Step 1: Add models to schema.prisma**

Add after `model Payslip {` block and before `model AppSetting {`:

```prisma
model ReviewCriteria {
  id       String  @id @default(cuid())
  name     String  @unique
  nameAr   String?
  isBase   Boolean @default(true)
  isActive Boolean @default(true)

  ratings ReviewRating[]
}

model PerformanceReview {
  id                  String   @id @default(cuid())
  employeeId          String
  year                Int
  quarter             Int
  overallRating       String?
  comments            String?
  bonusRecommendation Decimal? @db.Decimal(10, 2)
  status              String   @default("DRAFT")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  employee Employee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  ratings  ReviewRating[]
  goals    ReviewGoal[]
}

model ReviewRating {
  id         String   @id @default(cuid())
  reviewId   String
  criteriaId String?
  customName String?
  rating     String
  comment    String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  review   PerformanceReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  criteria ReviewCriteria?  @relation(fields: [criteriaId], references: [id])
}

model ReviewGoal {
  id          String    @id @default(cuid())
  reviewId    String
  description String
  targetDate  DateTime?
  isCompleted Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  review PerformanceReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
}
```

Add reverse relation to `model Employee {`:

```prisma
  employeeDocuments     EmployeeDocument[]
  performanceReviews    PerformanceReview[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_performance_models --create-only && npx prisma migrate dev && npx prisma generate
```

Expected: Migration created and applied. Prisma client regenerated.

- [ ] **Step 3: Add base criteria to seed script**

In `prisma/seed.ts`, add after the leaveTypes loop and before the console.log:

```typescript
  const criteria = [
    { name: 'Punctuality', nameAr: 'الالتزام بالمواعيد' },
    { name: 'Quality of Work', nameAr: 'جودة العمل' },
    { name: 'Teamwork', nameAr: 'العمل الجماعي' },
    { name: 'Attendance', nameAr: 'الحضور' },
    { name: 'Compliance', nameAr: 'الامتثال للسياسات' },
  ]

  for (const c of criteria) {
    await prisma.reviewCriteria.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    })
  }
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts
git commit -m "feat: add performance review models, migration, and seed data"
```

---

### Task 2: Validation Schemas + Query Functions

**Files:**
- Create: `src/lib/validations/performance.ts`
- Create: `src/lib/queries/performance.ts`

- [ ] **Step 1: Create Zod validation schemas**

Create `src/lib/validations/performance.ts`:

```typescript
import { z } from 'zod'

export const ratingSchema = z.object({
  criteriaId: z.string().optional(),
  customName: z.string().optional(),
  rating: z.enum(['EXCEEDS', 'MEETS', 'BELOW']),
  comment: z.string().optional(),
})

export const goalSchema = z.object({
  description: z.string().min(1, 'Goal description is required'),
  targetDate: z.string().optional(),
})

export const createReviewSchema = z.object({
  employeeId: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  quarter: z.number().int().min(1).max(4),
  comments: z.string().optional(),
  bonusRecommendation: z.number().min(0).optional(),
  ratings: z.array(ratingSchema).min(1, 'At least one rating is required'),
  goals: z.array(goalSchema),
})

export const deleteReviewSchema = z.object({
  id: z.string().min(1),
})
```

- [ ] **Step 2: Create query functions**

Create `src/lib/queries/performance.ts`:

```typescript
import { db } from '@/lib/db'

export async function getReviews(filters?: {
  employeeId?: string
  year?: number
  quarter?: number
  status?: string
}) {
  return db.performanceReview.findMany({
    where: {
      ...(filters?.employeeId && { employeeId: filters.employeeId }),
      ...(filters?.year && { year: filters.year }),
      ...(filters?.quarter && { quarter: filters.quarter }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, department: true } },
    },
    orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
  })
}

export async function getReviewById(id: string) {
  return db.performanceReview.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true, department: true, jobTitle: true } },
      ratings: {
        include: { criteria: { select: { name: true, nameAr: true } } },
      },
      goals: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function getBaseCriteria() {
  return db.reviewCriteria.findMany({
    where: { isActive: true, isBase: true },
    orderBy: { name: 'asc' },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/performance.ts src/lib/queries/performance.ts
git commit -m "feat: add performance validation schemas and query functions"
```

---

### Task 3: Server Actions for Performance

**Files:**
- Create: `src/lib/actions/performance.ts`

- [ ] **Step 1: Create server actions**

Create `src/lib/actions/performance.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { createReviewSchema, deleteReviewSchema } from '@/lib/validations/performance'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function computeOverallRating(ratings: { rating: string }[]): string {
  const values: Record<string, number> = { EXCEEDS: 3, MEETS: 2, BELOW: 1 }
  const avg = ratings.reduce((sum, r) => sum + (values[r.rating] || 0), 0) / ratings.length
  if (avg >= 2.6) return 'EXCEEDS'
  if (avg >= 1.6) return 'MEETS'
  return 'BELOW'
}

export async function createReview(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const raw = {
    employeeId: formData.get('employeeId') as string,
    year: parseInt(formData.get('year') as string),
    quarter: parseInt(formData.get('quarter') as string),
    comments: (formData.get('comments') as string) || undefined,
    bonusRecommendation: formData.get('bonusRecommendation')
      ? parseFloat(formData.get('bonusRecommendation') as string)
      : undefined,
    ratings: JSON.parse(formData.get('ratings') as string),
    goals: JSON.parse(formData.get('goals') as string || '[]'),
  }

  const parsed = createReviewSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const existing = await db.performanceReview.findFirst({
    where: {
      employeeId: parsed.data.employeeId,
      year: parsed.data.year,
      quarter: parsed.data.quarter,
    },
  })
  if (existing) return { error: 'A review already exists for this employee in this period' }

  const overallRating = computeOverallRating(parsed.data.ratings)

  await db.performanceReview.create({
    data: {
      employeeId: parsed.data.employeeId,
      year: parsed.data.year,
      quarter: parsed.data.quarter,
      overallRating,
      comments: parsed.data.comments || null,
      bonusRecommendation: parsed.data.bonusRecommendation || null,
      status: 'COMPLETED',
      ratings: {
        create: parsed.data.ratings.map(r => ({
          criteriaId: r.criteriaId || null,
          customName: r.customName || null,
          rating: r.rating,
          comment: r.comment || null,
        })),
      },
      goals: {
        create: parsed.data.goals.map(g => ({
          description: g.description,
          targetDate: g.targetDate ? new Date(g.targetDate) : null,
        })),
      },
    },
  })

  revalidatePath('/manager/performance')
  return { success: true }
}

export async function deleteReview(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = deleteReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request' }

  const review = await db.performanceReview.findUnique({ where: { id: parsed.data.id } })
  if (!review) return { error: 'Review not found' }

  await db.performanceReview.delete({ where: { id: parsed.data.id } })

  revalidatePath('/manager/performance')
  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/performance.ts
git commit -m "feat: add performance review server actions"
```

---

### Task 4: i18n Keys for Performance

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/ar.json`

- [ ] **Step 1: Add nav key to en.json**

In the `nav` block, add after `"payroll": "Payroll",`:

```json
    "performance": "Performance",
```

- [ ] **Step 2: Add performance namespace to en.json**

Add before `"common": {`:

```json
  "performance": {
    "title": "Performance Reviews",
    "newReview": "New Review",
    "reviewDetail": "Review Detail",
    "employee": "Employee",
    "department": "Department",
    "year": "Year",
    "quarter": "Quarter",
    "overallRating": "Overall Rating",
    "status": "Status",
    "comments": "Comments",
    "bonusRecommendation": "Bonus Recommendation (AED)",
    "ratings": "Ratings",
    "goals": "Goals",
    "goalDescription": "Goal Description",
    "targetDate": "Target Date",
    "addGoal": "Add Goal",
    "removeGoal": "Remove",
    "addCriteria": "Add Criteria",
    "removeCriteria": "Remove",
    "criteria": "Criteria",
    "customCriteria": "Custom Criteria",
    "rating": "Rating",
    "comment": "Comment",
    "noReviews": "No reviews yet",
    "noReviewsDesc": "Create your first performance review to get started.",
    "deleteConfirm": "Are you sure you want to delete this review?",
    "filterEmployee": "Filter by employee",
    "filterQuarter": "Filter by quarter",
    "filterYear": "Filter by year",
    "filterStatus": "Filter by status",
    "allEmployees": "All Employees",
    "allQuarters": "All Quarters",
    "allYears": "All Years",
    "allStatuses": "All Statuses",
    "q1": "Q1",
    "q2": "Q2",
    "q3": "Q3",
    "q4": "Q4",
    "ratingValues": {
      "EXCEEDS": "Exceeds Expectations",
      "MEETS": "Meets Expectations",
      "BELOW": "Below Expectations"
    },
    "statusValues": {
      "DRAFT": "Draft",
      "COMPLETED": "Completed"
    },
    "success": {
      "created": "Review created successfully",
      "deleted": "Review deleted"
    },
    "errors": {
      "createFailed": "Failed to create review",
      "deleteFailed": "Failed to delete review",
      "alreadyExists": "A review already exists for this employee in this period"
    }
  },
```

- [ ] **Step 3: Add nav key to ar.json**

In the `nav` block, add after `"payroll": "الرواتب",`:

```json
    "performance": "الأداء",
```

- [ ] **Step 4: Add performance namespace to ar.json**

Add before `"common": {`:

```json
  "performance": {
    "title": "تقييم الأداء",
    "newReview": "تقييم جديد",
    "reviewDetail": "تفاصيل التقييم",
    "employee": "الموظف",
    "department": "القسم",
    "year": "السنة",
    "quarter": "الربع",
    "overallRating": "التقييم العام",
    "status": "الحالة",
    "comments": "ملاحظات",
    "bonusRecommendation": "مكافأة مقترحة (درهم)",
    "ratings": "التقييمات",
    "goals": "الأهداف",
    "goalDescription": "وصف الهدف",
    "targetDate": "تاريخ الاستهداف",
    "addGoal": "إضافة هدف",
    "removeGoal": "إزالة",
    "addCriteria": "إضافة معيار",
    "removeCriteria": "إزالة",
    "criteria": "المعيار",
    "customCriteria": "معيار مخصص",
    "rating": "التقييم",
    "comment": "تعليق",
    "noReviews": "لا توجد تقييمات بعد",
    "noReviewsDesc": "قم بإنشاء أول تقييم أداء للبدء.",
    "deleteConfirm": "هل أنت متأكد من حذف هذا التقييم؟",
    "filterEmployee": "تصفية حسب الموظف",
    "filterQuarter": "تصفية حسب الربع",
    "filterYear": "تصفية حسب السنة",
    "filterStatus": "تصفية حسب الحالة",
    "allEmployees": "جميع الموظفين",
    "allQuarters": "جميع الأرباع",
    "allYears": "جميع السنوات",
    "allStatuses": "جميع الحالات",
    "q1": "الربع الأول",
    "q2": "الربع الثاني",
    "q3": "الربع الثالث",
    "q4": "الربع الرابع",
    "ratingValues": {
      "EXCEEDS": "يفوق التوقعات",
      "MEETS": "يلبي التوقعات",
      "BELOW": "دون التوقعات"
    },
    "statusValues": {
      "DRAFT": "مسودة",
      "COMPLETED": "مكتمل"
    },
    "success": {
      "created": "تم إنشاء التقييم بنجاح",
      "deleted": "تم حذف التقييم"
    },
    "errors": {
      "createFailed": "فشل إنشاء التقييم",
      "deleteFailed": "فشل حذف التقييم",
      "alreadyExists": "يوجد تقييم لهذا الموظف في هذه الفترة بالفعل"
    }
  },
```

- [ ] **Step 5: Commit**

```bash
git add src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: add performance i18n keys for EN and AR"
```

---

### Task 5: Reviews List Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/performance/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/performance/performance-client.tsx`

- [ ] **Step 1: Create server component**

Create `src/app/[locale]/(hr)/manager/performance/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { getReviews } from '@/lib/queries/performance'
import { getAllActiveEmployees } from '@/lib/queries/attendance'
import { PerformanceClient } from './performance-client'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const [reviews, employees] = await Promise.all([
    getReviews(),
    getAllActiveEmployees(),
  ])

  return (
    <PerformanceClient
      reviews={reviews.map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        department: r.employee.department,
        year: r.year,
        quarter: r.quarter,
        overallRating: r.overallRating,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))}
      employees={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
    />
  )
}
```

- [ ] **Step 2: Create client component**

Create `src/app/[locale]/(hr)/manager/performance/performance-client.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deleteReview } from '@/lib/actions/performance'
import { Plus, Trash2, Eye } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'next/navigation'

interface ReviewData {
  id: string
  employeeId: string
  employeeName: string
  department: string
  year: number
  quarter: number
  overallRating: string | null
  status: string
  createdAt: string
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
}

interface Props {
  reviews: ReviewData[]
  employees: EmployeeData[]
}

export function PerformanceClient({ reviews, employees }: Props) {
  const t = useTranslations('performance')
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterQuarter, setFilterQuarter] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [message, setMessage] = useState('')

  const currentYear = new Date().getFullYear()

  const filtered = reviews.filter(r => {
    if (filterEmployee && r.employeeId !== filterEmployee) return false
    if (filterQuarter && r.quarter !== parseInt(filterQuarter)) return false
    if (filterYear && r.year !== parseInt(filterYear)) return false
    if (filterStatus && r.status !== filterStatus) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    const form = new FormData()
    form.set('id', id)
    const result = await deleteReview(form)
    if (result?.error) setMessage(result.error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push(`/${locale}/manager/performance/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t('newReview')}
        </Button>
      </div>

      {message && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <select className="rounded border px-3 py-2 text-sm" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
          <option value="">{t('allEmployees')}</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
          ))}
        </select>
        <select className="rounded border px-3 py-2 text-sm" value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)}>
          <option value="">{t('allQuarters')}</option>
          {[1, 2, 3, 4].map(q => (
            <option key={q} value={q}>{t(`q${q}`)}</option>
          ))}
        </select>
        <select className="rounded border px-3 py-2 text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">{t('allYears')}</option>
          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className="rounded border px-3 py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{t('allStatuses')}</option>
          <option value="DRAFT">{t('statusValues.DRAFT')}</option>
          <option value="COMPLETED">{t('statusValues.COMPLETED')}</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('department')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('year')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('quarter')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('overallRating')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">{t('noReviews')}</td>
                  </tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">{r.employeeName}</td>
                    <td className="px-4 py-3">{r.department}</td>
                    <td className="px-4 py-3">{r.year}</td>
                    <td className="px-4 py-3">{t(`q${r.quarter}`)}</td>
                    <td className="px-4 py-3">{r.overallRating ? t(`ratingValues.${r.overallRating}`) : '-'}</td>
                    <td className="px-4 py-3">{t(`statusValues.${r.status}`)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/manager/performance/${r.id}`)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(hr)/manager/performance/"
git commit -m "feat: add performance reviews list page"
```

---

### Task 6: New Review Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/performance/new/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/performance/new/new-review-client.tsx`

- [ ] **Step 1: Create server component**

Create `src/app/[locale]/(hr)/manager/performance/new/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { getBaseCriteria } from '@/lib/queries/performance'
import { getAllActiveEmployees } from '@/lib/queries/attendance'
import { NewReviewClient } from './new-review-client'

export const dynamic = 'force-dynamic'

export default async function NewReviewPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const [criteria, employees] = await Promise.all([
    getBaseCriteria(),
    getAllActiveEmployees(),
  ])

  return (
    <NewReviewClient
      criteria={criteria.map(c => ({ id: c.id, name: c.name, nameAr: c.nameAr }))}
      employees={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
    />
  )
}
```

- [ ] **Step 2: Create client component**

Create `src/app/[locale]/(hr)/manager/performance/new/new-review-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createReview } from '@/lib/actions/performance'
import { Plus, Trash2, Upload } from 'lucide-react'

interface CriteriaData {
  id: string
  name: string
  nameAr: string | null
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
}

interface Props {
  criteria: CriteriaData[]
  employees: EmployeeData[]
}

interface RatingEntry {
  criteriaId?: string
  customName?: string
  rating: 'EXCEEDS' | 'MEETS' | 'BELOW'
  comment: string
}

interface GoalEntry {
  description: string
  targetDate: string
}

const currentYear = new Date().getFullYear()
const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1

export function NewReviewClient({ criteria, employees }: Props) {
  const t = useTranslations('performance')
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [employeeId, setEmployeeId] = useState('')
  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState(currentQuarter)
  const [comments, setComments] = useState('')
  const [bonus, setBonus] = useState('')
  const [ratings, setRatings] = useState<RatingEntry[]>(
    criteria.map(c => ({ criteriaId: c.id, rating: 'MEETS', comment: '' }))
  )
  const [customRatings, setCustomRatings] = useState<RatingEntry[]>([])
  const [goals, setGoals] = useState<GoalEntry[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!employeeId) { setMessage('Please select an employee'); return }
    setSaving(true)
    setMessage('')

    const allRatings = [
      ...ratings.filter(r => r.rating),
      ...customRatings.filter(r => r.customName && r.rating),
    ]

    const form = new FormData()
    form.set('employeeId', employeeId)
    form.set('year', String(year))
    form.set('quarter', String(quarter))
    form.set('comments', comments)
    if (bonus) form.set('bonusRecommendation', bonus)
    form.set('ratings', JSON.stringify(allRatings))
    form.set('goals', JSON.stringify(goals.filter(g => g.description)))

    const result = await createReview(form)
    if (result?.error) {
      setMessage(result.error)
      setSaving(false)
    } else {
      router.push(`/${locale}/manager/performance`)
      router.refresh()
    }
  }

  const updateRating = (index: number, field: keyof RatingEntry, value: string) => {
    const updated = [...ratings]
    ;(updated[index] as any)[field] = value
    setRatings(updated)
  }

  const updateCustomRating = (index: number, field: keyof RatingEntry, value: string) => {
    const updated = [...customRatings]
    ;(updated[index] as any)[field] = value
    setCustomRatings(updated)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('newReview')}</h1>

      {message && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{t('employee')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">{t('employee')}</label>
              <select className="w-full rounded border px-3 py-2 text-sm" value={employeeId} onChange={e => setEmployeeId(e.target.value)} required>
                <option value="">{t('employee')}</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-zinc-500">{t('year')}</label>
                <select className="w-full rounded border px-3 py-2 text-sm" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-zinc-500">{t('quarter')}</label>
                <select className="w-full rounded border px-3 py-2 text-sm" value={quarter} onChange={e => setQuarter(parseInt(e.target.value))}>
                  {[1, 2, 3, 4].map(q => (
                    <option key={q} value={q}>{t(`q${q}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('ratings')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {ratings.map((r, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded bg-zinc-50 p-3">
                <div className="min-w-[150px] flex-1">
                  <label className="text-xs font-medium text-zinc-500">{t('criteria')}</label>
                  <div className="py-2 text-sm font-medium">{criteria[i]?.name}</div>
                </div>
                <div className="min-w-[130px]">
                  <label className="text-xs font-medium text-zinc-500">{t('rating')}</label>
                  <select className="w-full rounded border px-3 py-2 text-sm" value={r.rating} onChange={e => updateRating(i, 'rating', e.target.value)}>
                    <option value="EXCEEDS">{t('ratingValues.EXCEEDS')}</option>
                    <option value="MEETS">{t('ratingValues.MEETS')}</option>
                    <option value="BELOW">{t('ratingValues.BELOW')}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-zinc-500">{t('comment')}</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={r.comment} onChange={e => updateRating(i, 'comment', e.target.value)} />
                </div>
              </div>
            ))}

            {customRatings.map((r, i) => (
              <div key={`c-${i}`} className="flex flex-wrap items-end gap-3 rounded border border-dashed bg-zinc-50 p-3">
                <div className="min-w-[150px] flex-1">
                  <label className="text-xs font-medium text-zinc-500">{t('customCriteria')}</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={r.customName || ''} onChange={e => updateCustomRating(i, 'customName', e.target.value)} placeholder="Criteria name" />
                </div>
                <div className="min-w-[130px]">
                  <label className="text-xs font-medium text-zinc-500">{t('rating')}</label>
                  <select className="w-full rounded border px-3 py-2 text-sm" value={r.rating} onChange={e => updateCustomRating(i, 'rating', e.target.value)}>
                    <option value="EXCEEDS">{t('ratingValues.EXCEEDS')}</option>
                    <option value="MEETS">{t('ratingValues.MEETS')}</option>
                    <option value="BELOW">{t('ratingValues.BELOW')}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-zinc-500">{t('comment')}</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={r.comment} onChange={e => updateCustomRating(i, 'comment', e.target.value)} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCustomRatings(customRatings.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={() => setCustomRatings([...customRatings, { rating: 'MEETS', comment: '' }])}>
              <Plus className="me-1 h-3 w-3" />{t('addCriteria')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('goals')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {goals.map((g, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded bg-zinc-50 p-3">
                <div className="min-w-[200px] flex-1">
                  <label className="text-xs font-medium text-zinc-500">{t('goalDescription')}</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={g.description} onChange={e => {
                    const updated = [...goals]; updated[i].description = e.target.value; setGoals(updated)
                  }} required />
                </div>
                <div className="min-w-[140px]">
                  <label className="text-xs font-medium text-zinc-500">{t('targetDate')}</label>
                  <input type="date" className="w-full rounded border px-3 py-2 text-sm" value={g.targetDate} onChange={e => {
                    const updated = [...goals]; updated[i].targetDate = e.target.value; setGoals(updated)
                  }} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setGoals(goals.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setGoals([...goals, { description: '', targetDate: '' }])}>
              <Plus className="me-1 h-3 w-3" />{t('addGoal')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('comments')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">{t('comments')}</label>
              <textarea className="w-full rounded border px-3 py-2 text-sm" rows={3} value={comments} onChange={e => setComments(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">{t('bonusRecommendation')}</label>
              <input type="number" step="0.01" min="0" className="w-full max-w-xs rounded border px-3 py-2 text-sm" value={bonus} onChange={e => setBonus(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            <Upload className="me-2 h-4 w-4" />{saving ? 'Saving...' : t('newReview')}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(hr)/manager/performance/new/"
git commit -m "feat: add new performance review form page"
```

---

### Task 7: Review Detail Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/performance/[id]/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/performance/[id]/review-detail-client.tsx`

- [ ] **Step 1: Create server component**

Create `src/app/[locale]/(hr)/manager/performance/[id]/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { getReviewById } from '@/lib/queries/performance'
import { notFound } from 'next/navigation'
import { ReviewDetailClient } from './review-detail-client'

export const dynamic = 'force-dynamic'

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const review = await getReviewById(id)
  if (!review) notFound()

  return (
    <ReviewDetailClient
      review={{
        id: review.id,
        employeeName: `${review.employee.firstName} ${review.employee.lastName}`,
        department: review.employee.department,
        jobTitle: review.employee.jobTitle,
        year: review.year,
        quarter: review.quarter,
        overallRating: review.overallRating,
        comments: review.comments,
        bonusRecommendation: review.bonusRecommendation ? Number(review.bonusRecommendation) : null,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
        ratings: review.ratings.map(r => ({
          id: r.id,
          criteriaName: r.criteria?.name || r.customName || 'Custom',
          rating: r.rating,
          comment: r.comment,
        })),
        goals: review.goals.map(g => ({
          id: g.id,
          description: g.description,
          targetDate: g.targetDate?.toISOString() || null,
          isCompleted: g.isCompleted,
        })),
      }}
    />
  )
}
```

- [ ] **Step 2: Create client component**

Create `src/app/[locale]/(hr)/manager/performance/[id]/review-detail-client.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deleteReview } from '@/lib/actions/performance'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface RatingData {
  id: string
  criteriaName: string
  rating: string
  comment: string | null
}

interface GoalData {
  id: string
  description: string
  targetDate: string | null
  isCompleted: boolean
}

interface ReviewDetail {
  id: string
  employeeName: string
  department: string
  jobTitle: string
  year: number
  quarter: number
  overallRating: string | null
  comments: string | null
  bonusRecommendation: number | null
  status: string
  createdAt: string
  ratings: RatingData[]
  goals: GoalData[]
}

interface Props {
  review: ReviewDetail
}

export function ReviewDetailClient({ review }: Props) {
  const t = useTranslations('performance')
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [message, setMessage] = useState('')

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return
    const form = new FormData()
    form.set('id', review.id)
    const result = await deleteReview(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      router.push(`/${locale}/manager/performance`)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/manager/performance`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('reviewDetail')}</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="me-2 h-4 w-4" />{t('deleteConfirm')}
        </Button>
      </div>

      {message && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</div>
      )}

      <Card>
        <CardHeader><CardTitle>{t('employee')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">{t('employee')}:</span> {review.employeeName}</div>
            <div><span className="font-medium">{t('department')}:</span> {review.department}</div>
            <div><span className="font-medium">{t('year')}/{t('quarter')}:</span> {review.year} / {t(`q${review.quarter}`)}</div>
            <div><span className="font-medium">{t('overallRating')}:</span> {review.overallRating ? t(`ratingValues.${review.overallRating}`) : '-'}</div>
            <div><span className="font-medium">{t('status')}:</span> {t(`statusValues.${review.status}`)}</div>
            {review.bonusRecommendation != null && (
              <div><span className="font-medium">{t('bonusRecommendation')}:</span> {review.bonusRecommendation.toFixed(2)} AED</div>
            )}
          </div>
          {review.comments && (
            <div className="mt-3 text-sm"><span className="font-medium">{t('comments')}:</span> {review.comments}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('ratings')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="px-4 py-3 text-start font-medium">{t('criteria')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('rating')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('comment')}</th>
                </tr>
              </thead>
              <tbody>
                {review.ratings.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">{r.criteriaName}</td>
                    <td className="px-4 py-3">{t(`ratingValues.${r.rating}`)}</td>
                    <td className="px-4 py-3">{r.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('goals')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="px-4 py-3 text-start font-medium">{t('goalDescription')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('targetDate')}</th>
                </tr>
              </thead>
              <tbody>
                {review.goals.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-4 text-center text-zinc-500">-</td></tr>
                ) : review.goals.map(g => (
                  <tr key={g.id} className="border-b last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">{g.description}</td>
                    <td className="px-4 py-3">{g.targetDate ? new Date(g.targetDate).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(hr)/manager/performance/[id]/"
git commit -m "feat: add performance review detail page"
```

---

### Task 8: Sidebar Update

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Enable performance sidebar link**

Import `BarChart3` from lucide-react (add to the existing import block):

```typescript
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarRange,
  Clock,
  ListChecks,
  Banknote,
  FolderOpen,
  BarChart3,
  LogOut,
} from 'lucide-react'
```

Add performance nav item before the LogOut separator (after the payroll item):

```typescript
    { href: '/manager/performance', icon: BarChart3, label: 'performance', show: role === 'MANAGER' },
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: enable performance sidebar link for manager"
```

---

## Self-Review

### Spec Coverage
- **ReviewCriteria model** → Task 1
- **PerformanceReview model** → Task 1
- **ReviewRating model** → Task 1
- **ReviewGoal model** → Task 1
- **Base criteria seeded** → Task 1
- **Zod validation schemas** → Task 2
- **Query functions** → Task 2
- **createReview server action** → Task 3
- **deleteReview server action** → Task 3
- **Overall rating computation** → Task 3
- **i18n EN/AR** → Task 4
- **Reviews list page with filters** → Task 5
- **New review form page** → Task 6
- **Review detail page** → Task 7
- **Sidebar link** → Task 8

### Placeholder Check
- All code blocks complete. No TBD, TODO, or vague steps.

### Type Consistency
- Model field names match between Prisma schema, Zod schemas, queries, actions, and UI components
- `createReviewSchema.ratings` type matches `ratingSchema` which matches `ReviewRating` model
- `createReviewSchema.goals` matches `ReviewGoal` model
- Server component data shapes match client component Props

### Notes
- Reviews created as COMPLETED in one step (no draft workflow)
- Edits not supported — delete and recreate
- Payroll integration (bonus display on payslip) deferred to be added when payslip page is next modified
