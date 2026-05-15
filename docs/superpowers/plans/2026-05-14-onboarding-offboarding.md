# Onboarding / Offboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build checklist-based onboarding and offboarding workflows with employee self-service forms and manager task tracking.

**Architecture:** 4 new Prisma models (OnboardingTask template, EmployeeOnboarding instance, EmployeeOnboardingTask tracking), server actions in `src/lib/actions/onboarding.ts`, manager pages under `/[locale]/manager/onboarding/*` and `/[locale]/manager/offboarding/*`, employee page under `/[locale]/onboarding`. Tasks auto-complete when forms submitted or docs uploaded; manager tasks are manual check-off.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma v5, Tailwind v4, next-intl, Zod, react-hook-form

---

### Task 1: Add Prisma Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add OnboardingTask model after the PerformanceReview models**

Add after line 264 (`}` of ReviewGoal model):

```prisma
model OnboardingTask {
  id          String   @id @default(cuid())
  type        String   // "ONBOARDING" | "OFFBOARDING"
  titleEn     String
  titleAr     String
  category    String   // "FORM" | "DOCUMENT" | "MANAGER_ACTION"
  roles       Role[]
  order       Int
  formSchema  Json?    // Zod schema for employee-filled forms
  isRequired  Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model EmployeeOnboarding {
  id              String   @id @default(cuid())
  employeeId      String
  type            String   // "ONBOARDING" | "OFFBOARDING"
  status          String   @default("IN_PROGRESS") // PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  reason          String?  // offboarding reason
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  employee Employee                @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  tasks    EmployeeOnboardingTask[]
}

model EmployeeOnboardingTask {
  id               String   @id @default(cuid())
  onboardingId     String
  taskTemplateId   String
  assignedTo       String   // "EMPLOYEE" | "MANAGER"
  status           String   @default("PENDING") // PENDING | COMPLETED
  completedAt      DateTime?
  completedById    String?
  formData         Json?
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  onboarding   EmployeeOnboarding @relation(fields: [onboardingId], references: [id], onDelete: Cascade)
  taskTemplate OnboardingTask     @relation(fields: [taskTemplateId], references: [id])
}
```

- [ ] **Step 2: Run migration**

Run:
```powershell
npx prisma migrate dev --name add_onboarding_offboarding
```
Expected: Migration applied, Prisma Client generated.

---

### Task 2: Seed Onboarding/Offboarding Task Templates

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add onboarding task seed data**

Find the comment `// ── Performance Criteria ──` (line 70). Before that section, add:

```typescript
// ── Onboarding / Offboarding Task Templates ──
const onboardingTasks: { type: string; titleEn: string; titleAr: string; category: string; roles: Role[]; order: number; isRequired: boolean }[] = [
  // Onboarding: FORM tasks (employee fills)
  { type: 'ONBOARDING', titleEn: 'Personal Information', titleAr: 'المعلومات الشخصية', category: 'FORM', roles: [Role.EMPLOYEE], order: 1, isRequired: true },
  { type: 'ONBOARDING', titleEn: 'Bank Account Details', titleAr: 'تفاصيل الحساب البنكي', category: 'FORM', roles: [Role.EMPLOYEE], order: 2, isRequired: true },
  { type: 'ONBOARDING', titleEn: 'Emergency Contact', titleAr: 'جهة الاتصال في الطوارئ', category: 'FORM', roles: [Role.EMPLOYEE], order: 3, isRequired: true },
  // Onboarding: DOCUMENT tasks (employee uploads)
  { type: 'ONBOARDING', titleEn: 'Passport Copy', titleAr: 'نسخة جواز السفر', category: 'DOCUMENT', roles: [Role.EMPLOYEE], order: 4, isRequired: true },
  { type: 'ONBOARDING', titleEn: 'Visa / ID', titleAr: 'الإقامة / الهوية', category: 'DOCUMENT', roles: [Role.EMPLOYEE], order: 5, isRequired: true },
  { type: 'ONBOARDING', titleEn: 'Certificate / Qualification', titleAr: 'الشهادات / المؤهلات', category: 'DOCUMENT', roles: [Role.EMPLOYEE], order: 6, isRequired: false },
  // Onboarding: MANAGER_ACTION tasks
  { type: 'ONBOARDING', titleEn: 'Assign Workspace / Locker', titleAr: 'تخصيص مساحة عمل / خزانة', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 7, isRequired: true },
  { type: 'ONBOARDING', titleEn: 'Uniform Fitting', titleAr: 'تجهيز الزي الرسمي', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 8, isRequired: true },
  { type: 'ONBOARDING', titleEn: 'Policy Review & Acknowledgment', titleAr: 'مراجعة السياسات والتوقيع', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 9, isRequired: true },
  // Offboarding: FORM
  { type: 'OFFBOARDING', titleEn: 'Exit Interview', titleAr: 'مقابلة الخروج', category: 'FORM', roles: [Role.EMPLOYEE], order: 1, isRequired: true },
  // Offboarding: MANAGER_ACTION
  { type: 'OFFBOARDING', titleEn: 'Collect Keys / Access Cards', titleAr: 'استلام المفاتيح / بطاقات الدخول', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 2, isRequired: true },
  { type: 'OFFBOARDING', titleEn: 'Return Uniform / Equipment', titleAr: 'إعادة الزي الرسمي / المعدات', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 3, isRequired: true },
  { type: 'OFFBOARDING', titleEn: 'Final Settlement Notification', titleAr: 'إشعار التسوية النهائية', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 4, isRequired: true },
]

for (const task of onboardingTasks) {
  await prisma.onboardingTask.create({ data: task })
}
```

Insert this block before the Performance Criteria section.

- [ ] **Step 2: Verify seed compiles**

Run:
```powershell
npx tsx prisma/seed.ts
```
Expected: Seed runs without error. (It may produce duplicate key warnings for existing data — that's fine.)

---

### Task 3: Create Server Actions

**Files:**
- Create: `src/lib/actions/onboarding.ts`

- [ ] **Step 1: Write the server actions file**

```typescript
'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'

export async function startOnboarding(employeeId: string, type: 'ONBOARDING' | 'OFFBOARDING', reason?: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  const templates = await db.onboardingTask.findMany({
    where: { type },
    orderBy: { order: 'asc' },
  })

  const onboarding = await db.employeeOnboarding.create({
    data: {
      employeeId,
      type,
      reason: reason ?? null,
      status: 'IN_PROGRESS',
      tasks: {
        create: templates.map((t) => ({
          taskTemplateId: t.id,
          assignedTo: t.category === 'MANAGER_ACTION' ? 'MANAGER' : 'EMPLOYEE',
          status: 'PENDING',
        })),
      },
    },
    include: { tasks: true },
  })

  revalidatePath(`/${session.user.role === 'HR_ADMIN' ? 'en' : 'en'}/manager/${type.toLowerCase()}`)
  return { id: onboarding.id }
}

export async function completeOnboardingTask(taskId: string, formData?: Record<string, unknown>) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const task = await db.employeeOnboardingTask.findUnique({
    where: { id: taskId },
    include: {
      taskTemplate: true,
      onboarding: { include: { employee: true } },
    },
  })

  if (!task) return { error: 'Task not found' }
  if (task.status === 'COMPLETED') return { error: 'Task already completed' }

  if (task.assignedTo === 'EMPLOYEE') {
    const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
    if (!employee || employee.id !== task.onboarding.employeeId) return { error: 'Not your task' }
  } else {
    if (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER') return { error: 'Unauthorized' }
  }

  await db.employeeOnboardingTask.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedById: session.user.id,
      formData: formData ?? undefined,
    },
  })

  // Check if all tasks completed -> mark onboarding complete
  const allTasks = await db.employeeOnboardingTask.findMany({
    where: { onboardingId: task.onboardingId },
  })

  const allDone = allTasks.every((t) => t.status === 'COMPLETED')
  if (allDone) {
    await db.employeeOnboarding.update({
      where: { id: task.onboardingId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  }

  const localePath = session.user.role === 'HR_ADMIN' || session.user.role === 'MANAGER'
    ? `/en/manager/${task.onboarding.type.toLowerCase()}/${task.onboardingId}`
    : `/en/onboarding`

  revalidatePath(localePath)
  return { success: true }
}

export async function getOnboardingRecords(type: 'ONBOARDING' | 'OFFBOARDING') {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return []
  }

  return db.employeeOnboarding.findMany({
    where: { type },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true, department: true, employeeCode: true },
      },
      tasks: {
        include: { taskTemplate: true },
        orderBy: { taskTemplate: { order: 'asc' } },
      },
    },
    orderBy: { startedAt: 'desc' },
  })
}

export async function getMyOnboarding() {
  const session = await auth()
  if (!session?.user) return null

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return null

  return db.employeeOnboarding.findFirst({
    where: { employeeId: employee.id, type: 'ONBOARDING', status: { in: ['PENDING', 'IN_PROGRESS'] } },
    include: {
      tasks: {
        include: { taskTemplate: true },
        orderBy: { taskTemplate: { order: 'asc' } },
      },
    },
  })
}

export async function getActiveEmployees() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return []
  }

  return db.employee.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, jobTitle: true, department: true, employeeCode: true },
    orderBy: { firstName: 'asc' },
  })
}
```

---

### Task 4: Manager Onboarding List Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/onboarding/page.tsx`

- [ ] **Step 1: Create the manager onboarding list page**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOnboardingRecords } from '@/lib/actions/onboarding'
import OnboardingListClient from './onboarding-list-client'

export default async function ManagerOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const records = await getOnboardingRecords('ONBOARDING')
  return <OnboardingListClient records={JSON.parse(JSON.stringify(records))} type="ONBOARDING" locale={locale} />
}
```

- [ ] **Step 2: Create the client component**

Create `src/app/[locale]/(hr)/manager/onboarding/onboarding-list-client.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Eye } from 'lucide-react'

type Record = {
  id: string
  employee: { firstName: string; lastName: string; jobTitle: string; department: string }
  status: string
  startedAt: string
  completedAt: string | null
  tasks: { status: string }[]
}

export default function OnboardingListClient({ records, type, locale }: { records: Record[]; type: string; locale: string }) {
  const t = useTranslations('onboarding')
  const basePath = `/${locale}/manager/${type.toLowerCase()}`

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{type === 'ONBOARDING' ? t('listTitle') : t('offboardListTitle')}</h1>
        <Link
          href={`${basePath}/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {type === 'ONBOARDING' ? t('newOnboarding') : t('newOffboarding')}
        </Link>
      </div>

      <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.065)]">
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('employee')}</th>
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('department')}</th>
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('progress')}</th>
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('status')}</th>
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('started')}</th>
              <th className="text-right py-3 px-4 text-[#8B93A8] font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#8B93A8]">{t('noRecords')}</td>
              </tr>
            )}
            {records.map((r) => {
              const total = r.tasks.length
              const done = r.tasks.filter((t) => t.status === 'COMPLETED').length
              const statusColors: Record<string, string> = {
                IN_PROGRESS: 'bg-[#D4A843] text-[#07091A]',
                COMPLETED: 'bg-[#22A854] text-white',
                PENDING: 'bg-[#8B93A8] text-white',
                CANCELLED: 'bg-[#EF4444] text-white',
              }
              return (
                <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="py-3 px-4 text-[#E0E6F4] font-medium">{r.employee.firstName} {r.employee.lastName}</td>
                  <td className="py-3 px-4 text-[#8B93A8]">{r.employee.department}</td>
                  <td className="py-3 px-4 text-[#E0E6F4]">{done}/{total}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || statusColors.PENDING}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#8B93A8]">{new Date(r.startedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`${basePath}/${r.id}`} className="inline-flex items-center gap-1 text-[#D4A843] hover:text-[#EFC254] text-sm">
                      <Eye className="w-4 h-4" />
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

### Task 5: Manager Start New Onboarding Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/onboarding/new/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/onboarding/new/new-onboarding-client.tsx`

- [ ] **Step 1: Create the server page**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveEmployees } from '@/lib/actions/onboarding'
import NewOnboardingClient from './new-onboarding-client'

export default async function NewOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const employees = await getActiveEmployees()
  return <NewOnboardingClient employees={JSON.parse(JSON.stringify(employees))} locale={locale} />
}
```

- [ ] **Step 2: Create the client component**

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { startOnboarding } from '@/lib/actions/onboarding'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string; department: string; employeeCode: string }

export default function NewOnboardingClient({ employees, locale }: { employees: Employee[]; locale: string }) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setLoading(true)
    setError('')
    const result = await startOnboarding(selectedId, 'ONBOARDING')
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/${locale}/manager/onboarding/${result.id}`)
      router.refresh()
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <Link href={`/${locale}/manager/onboarding`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </Link>

      <h1 className="text-xl font-syne font-bold text-[#E0E6F4] mb-6">{t('startOnboarding')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-2">{t('selectEmployee')}</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 bg-[#0D0F1A] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]"
          >
            <option value="">{t('chooseEmployee')}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} — {emp.jobTitle} ({emp.department})
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-[#EF4444] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !selectedId}
          className="w-full px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50"
        >
          {loading ? t('starting') : t('launchOnboarding')}
        </button>
      </form>
    </div>
  )
}
```

---

### Task 6: Manager Onboarding Detail Page

**Files:**
- Create: `src/app/[locale]/(hr)/manager/onboarding/[id]/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/onboarding/[id]/onboarding-detail-client.tsx`

- [ ] **Step 1: Create the server page**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import OnboardingDetailClient from './onboarding-detail-client'

export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const record = await db.employeeOnboarding.findUnique({
    where: { id },
    include: {
      employee: true,
      tasks: {
        include: { taskTemplate: true },
        orderBy: { taskTemplate: { order: 'asc' } },
      },
    },
  })

  if (!record) redirect(`/${locale}/manager/onboarding`)

  return <OnboardingDetailClient record={JSON.parse(JSON.stringify(record))} locale={locale} />
}
```

- [ ] **Step 2: Create the client component**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { completeOnboardingTask } from '@/lib/actions/onboarding'
import { ArrowLeft, CheckCircle, Circle, Upload, FileText } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

type Task = {
  id: string
  status: string
  assignedTo: string
  completedAt: string | null
  formData: unknown
  notes: string | null
  taskTemplate: {
    titleEn: string
    titleAr: string
    category: string
  }
}

type Record = {
  id: string
  type: string
  status: string
  reason: string | null
  startedAt: string
  completedAt: string | null
  employee: {
    firstName: string
    lastName: string
    jobTitle: string
    department: string
    employeeCode: string
  }
  tasks: Task[]
}

export default function OnboardingDetailClient({ record, locale }: { record: Record; locale: string }) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [completing, setCompleting] = useState<string | null>(null)

  const total = record.tasks.length
  const done = record.tasks.filter((t) => t.status === 'COMPLETED').length
  const pendingEmployee = record.tasks.filter((t) => t.assignedTo === 'EMPLOYEE' && t.status === 'PENDING').length
  const pendingManager = record.tasks.filter((t) => t.assignedTo === 'MANAGER' && t.status === 'PENDING').length

  async function handleComplete(taskId: string) {
    setCompleting(taskId)
    await completeOnboardingTask(taskId)
    setCompleting(null)
    router.refresh()
  }

  const statusColors: Record<string, string> = {
    IN_PROGRESS: 'bg-[#D4A843] text-[#07091A]',
    COMPLETED: 'bg-[#22A854] text-white',
    PENDING: 'bg-[#8B93A8] text-white',
    CANCELLED: 'bg-[#EF4444] text-white',
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    FORM: <FileText className="w-4 h-4 text-[#D4A843]" />,
    DOCUMENT: <Upload className="w-4 h-4 text-[#D4A843]" />,
    MANAGER_ACTION: <CheckCircle className="w-4 h-4 text-[#D4A843]" />,
  }

  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/${locale}/manager/${record.type.toLowerCase()}`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">
            {record.employee.firstName} {record.employee.lastName}
          </h1>
          <p className="text-sm text-[#8B93A8]">
            {record.employee.jobTitle} &middot; {record.employee.department}
            {record.reason && <span> &middot; {record.reason}</span>}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[record.status] || 'bg-[#8B93A8] text-white'}`}>
          {record.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0D0F1A] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
          <div className="text-2xl font-bold text-[#D4A843]">{done}/{total}</div>
          <div className="text-xs text-[#8B93A8]">{t('tasksCompleted')}</div>
        </div>
        <div className="bg-[#0D0F1A] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
          <div className="text-2xl font-bold text-[#E0E6F4]">{pendingEmployee}</div>
          <div className="text-xs text-[#8B93A8]">{t('pendingEmployee')}</div>
        </div>
        <div className="bg-[#0D0F1A] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
          <div className="text-2xl font-bold text-[#E0E6F4]">{pendingManager}</div>
          <div className="text-xs text-[#8B93A8]">{t('pendingManager')}</div>
        </div>
      </div>

      <div className="space-y-2">
        {record.tasks.map((task) => {
          const isDone = task.status === 'COMPLETED'
          const isManagerTask = task.assignedTo === 'MANAGER'
          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                isDone
                  ? 'bg-[#0D0F1A] border-[rgba(34,168,84,0.2)]'
                  : isManagerTask
                    ? 'bg-[rgba(212,168,67,0.04)] border-[#D4A84333]'
                    : 'bg-[#0D0F1A] border-[rgba(255,255,255,0.065)]'
              }`}
            >
              {isDone ? (
                <div className="w-6 h-6 rounded-full bg-[#22A854] flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              ) : (
                <Circle className="w-6 h-6 text-[#D4A843] flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {categoryIcons[task.taskTemplate.category]}
                  <span className="text-sm font-medium text-[#E0E6F4]">{task.taskTemplate.titleEn}</span>
                </div>
                <span className="text-xs text-[#8B93A8]">
                  {task.assignedTo === 'EMPLOYEE' ? t('employee') : t('manager')}
                  {task.completedAt && ` · ${new Date(task.completedAt).toLocaleDateString()}`}
                </span>
              </div>

              {!isDone && isManagerTask && (
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completing === task.id}
                  className="px-3 py-1.5 bg-[#D4A843] text-[#07091A] rounded-lg text-xs font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {completing === task.id ? '...' : t('complete')}
                </button>
              )}

              {!isDone && !isManagerTask && (
                <span className="text-xs text-[#D4A843] flex-shrink-0">{t('pending')}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

### Task 7: Offboarding Pages

**Files:**
- Create: `src/app/[locale]/(hr)/manager/offboarding/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/offboarding/new/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/offboarding/new/new-offboarding-client.tsx`
- Create: `src/app/[locale]/(hr)/manager/offboarding/[id]/page.tsx`

Offboarding pages reuse the same client components as onboarding. Create each directory and file:

- [ ] **Step 1: Create `src/app/[locale]/(hr)/manager/offboarding/page.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOnboardingRecords } from '@/lib/actions/onboarding'
import OnboardingListClient from '../onboarding/onboarding-list-client'

export default async function ManagerOffboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const records = await getOnboardingRecords('OFFBOARDING')
  return <OnboardingListClient records={JSON.parse(JSON.stringify(records))} type="OFFBOARDING" locale={locale} />
}
```

- [ ] **Step 2: Create `src/app/[locale]/(hr)/manager/offboarding/new/page.tsx`**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveEmployees } from '@/lib/actions/onboarding'
import NewOffboardingClient from './new-offboarding-client'

export default async function NewOffboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const employees = await getActiveEmployees()
  return <NewOffboardingClient employees={JSON.parse(JSON.stringify(employees))} locale={locale} />
}
```

- [ ] **Step 3: Create `src/app/[locale]/(hr)/manager/offboarding/new/new-offboarding-client.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { startOnboarding } from '@/lib/actions/onboarding'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string; department: string; employeeCode: string }

export default function NewOffboardingClient({ employees, locale }: { employees: Employee[]; locale: string }) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setLoading(true)
    setError('')
    const result = await startOnboarding(selectedId, 'OFFBOARDING', reason)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/${locale}/manager/offboarding/${result.id}`)
      router.refresh()
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <Link href={`/${locale}/manager/offboarding`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </Link>

      <h1 className="text-xl font-syne font-bold text-[#E0E6F4] mb-6">{t('startOffboarding')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-2">{t('selectEmployee')}</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 bg-[#0D0F1A] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]"
          >
            <option value="">{t('chooseEmployee')}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} — {emp.jobTitle} ({emp.department})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-2">{t('offboardingReason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-[#0D0F1A] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843] resize-none"
            placeholder={t('reasonPlaceholder')}
          />
        </div>

        {error && <p className="text-[#EF4444] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !selectedId}
          className="w-full px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50"
        >
          {loading ? t('starting') : t('launchOffboarding')}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/app/[locale]/(hr)/manager/offboarding/[id]/page.tsx`** (reuses onboarding detail client)

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import OnboardingDetailClient from '../../onboarding/[id]/onboarding-detail-client'

export default async function OffboardingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const record = await db.employeeOnboarding.findUnique({
    where: { id },
    include: {
      employee: true,
      tasks: {
        include: { taskTemplate: true },
        orderBy: { taskTemplate: { order: 'asc' } },
      },
    },
  })

  if (!record) redirect(`/${locale}/manager/offboarding`)

  return <OnboardingDetailClient record={JSON.parse(JSON.stringify(record))} locale={locale} />
}
```

---

### Task 8: Employee Onboarding Page

**Files:**
- Create: `src/app/[locale]/(hr)/onboarding/page.tsx`
- Create: `src/app/[locale]/(hr)/onboarding/employee-onboarding-client.tsx`

- [ ] **Step 1: Create the server page**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMyOnboarding } from '@/lib/actions/onboarding'
import EmployeeOnboardingClient from './employee-onboarding-client'

export default async function EmployeeOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const record = await getMyOnboarding()
  return <EmployeeOnboardingClient record={record ? JSON.parse(JSON.stringify(record)) : null} locale={locale} />
}
```

- [ ] **Step 2: Create the client component**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { completeOnboardingTask } from '@/lib/actions/onboarding'
import { CheckCircle, Circle, FileText, Upload } from 'lucide-react'

type Task = {
  id: string
  status: string
  assignedTo: string
  formData: unknown
  taskTemplate: {
    id: string
    titleEn: string
    titleAr: string
    category: string
  }
}

type Record = {
  id: string
  type: string
  status: string
  tasks: Task[]
}

export default function EmployeeOnboardingClient({ record, locale }: { record: Record | null; locale: string }) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  if (!record) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#8B93A8]">{t('noActiveOnboarding')}</p>
      </div>
    )
  }

  const total = record.tasks.length
  const done = record.tasks.filter((t) => t.status === 'COMPLETED').length
  const myTasks = record.tasks.filter((t) => t.assignedTo === 'EMPLOYEE')
  const pendingTasks = myTasks.filter((t) => t.status === 'PENDING')

  async function handleComplete(taskId: string) {
    setLoading(taskId)
    await completeOnboardingTask(taskId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('employeeTitle')}</h1>
        <p className="text-sm text-[#8B93A8]">{t('employeeSubtitle')}</p>
      </div>

      <div className="bg-[#0D0F1A] rounded-xl p-4 border border-[rgba(255,255,255,0.065)] mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-[#E0E6F4]">{t('yourChecklist')}</span>
          {pendingTasks.length > 0 && (
            <span className="px-2 py-0.5 bg-[#D4A843] text-[#07091A] rounded-full text-xs font-medium">
              {pendingTasks.length} {t('remaining')}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {myTasks.map((task) => {
            const isDone = task.status === 'COMPLETED'
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isDone
                    ? 'bg-[#0F1120] border-[rgba(34,168,84,0.2)]'
                    : 'bg-[#0F1120] border-[#D4A84333]'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-5 h-5 text-[#22A854] flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-[#D4A843] flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <span className="text-sm text-[#E0E6F4]">{task.taskTemplate.titleEn}</span>
                  <span className="text-xs text-[#8B93A8] ml-2">
                    {task.taskTemplate.category === 'FORM' ? t('form') : t('document')}
                  </span>
                </div>

                {!isDone && task.taskTemplate.category === 'FORM' && (
                  <button
                    onClick={() => handleComplete(task.id)}
                    disabled={loading === task.id}
                    className="px-3 py-1 bg-[#D4A843] text-[#07091A] rounded-lg text-xs font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {loading === task.id ? '...' : t('fillForm')}
                  </button>
                )}

                {!isDone && task.taskTemplate.category === 'DOCUMENT' && (
                  <button
                    onClick={() => handleComplete(task.id)}
                    disabled={loading === task.id}
                    className="px-3 py-1 bg-[#D4A843] text-[#07091A] rounded-lg text-xs font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {loading === task.id ? '...' : t('upload')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-[#0D0F1A] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
        <div className="text-sm text-[#8B93A8]">
          {t('progress')}: {done}/{total} {t('tasksCompleted')}
        </div>
      </div>
    </div>
  )
}
```

---

### Task 9: Add Sidebar Navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add onboarding nav items**

Add `DoorOpen` and `LogOut` to the import from `lucide-react`:

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
  ChevronLeft,
  BookUser,
  DoorOpen,
} from 'lucide-react'
```

Add the onboarding nav items after the `directory` entry in the `navItems` array:

```typescript
    { href: '/manager/onboarding', icon: DoorOpen, label: 'onboarding', show: isAdmin },
```

And add employee-side item after `attendance`:

```typescript
    { href: '/onboarding', icon: DoorOpen, label: 'myOnboarding', show: isEmployee },
```

The full `navItems` array becomes:

```typescript
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard', show: true },
    { href: '/directory', icon: BookUser, label: 'directory', show: true },
    { href: '/employees', icon: Users, label: 'employees', show: isAdmin },
    { href: '/manager/onboarding', icon: DoorOpen, label: 'onboarding', show: isAdmin },
    { href: '/leave', icon: CalendarCheck, label: 'myLeaves', show: true },
    { href: '/onboarding', icon: DoorOpen, label: 'myOnboarding', show: isEmployee },
    { href: '/manager/leaves', icon: CalendarRange, label: 'leaveRequests', show: isAdmin },
    { href: '/attendance', icon: Clock, label: 'attendance', show: true },
    { href: '/manager/attendance', icon: ListChecks, label: 'managerAttendance', show: isAdmin },
    { href: '/manager/payroll', icon: Banknote, label: 'payroll', show: isAdmin },
    { href: '/manager/performance', icon: BarChart3, label: 'performance', show: isAdmin },
    { href: '/manager/documents', icon: FolderOpen, label: 'documents', show: isAdmin },
  ].filter((item) => item.show)
```

---

### Task 10: Add i18n Translations

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/ar.json`

- [ ] **Step 1: Add English translations**

Add before the `common` key (line 419):

```json
  "onboarding": {
    "listTitle": "Onboarding",
    "offboardListTitle": "Offboarding",
    "newOnboarding": "New Onboarding",
    "newOffboarding": "New Offboarding",
    "startOnboarding": "Start Onboarding",
    "startOffboarding": "Start Offboarding",
    "back": "Back",
    "employee": "Employee",
    "department": "Department",
    "progress": "Progress",
    "status": "Status",
    "started": "Started",
    "view": "View",
    "noRecords": "No records found",
    "selectEmployee": "Select Employee",
    "chooseEmployee": "Choose an employee...",
    "offboardingReason": "Reason for leaving",
    "reasonPlaceholder": "Enter reason for offboarding...",
    "launchOnboarding": "Launch Onboarding",
    "launchOffboarding": "Launch Offboarding",
    "starting": "Starting...",
    "tasksCompleted": "tasks completed",
    "pendingEmployee": "Pending employee",
    "pendingManager": "Pending manager",
    "manager": "Manager",
    "complete": "Complete",
    "pending": "Pending",
    "employeeTitle": "My Onboarding",
    "employeeSubtitle": "Complete your onboarding tasks",
    "yourChecklist": "Your Onboarding Checklist",
    "remaining": "remaining",
    "form": "Form",
    "document": "Document",
    "fillForm": "Fill Form",
    "upload": "Upload",
    "noActiveOnboarding": "You have no active onboarding tasks"
  },
```

Add nav keys:

```json
    "onboarding": "Onboarding",
    "myOnboarding": "My Onboarding",
```

- [ ] **Step 2: Add Arabic translations**

Add the same keys with Arabic values before the `common` key in `ar.json`:

```json
  "onboarding": {
    "listTitle": "التعيين",
    "offboardListTitle": "إنهاء الخدمة",
    "newOnboarding": "تعيين جديد",
    "newOffboarding": "إنهاء خدمة",
    "startOnboarding": "بدء التعيين",
    "startOffboarding": "بدء إنهاء الخدمة",
    "back": "رجوع",
    "employee": "الموظف",
    "department": "القسم",
    "progress": "التقدم",
    "status": "الحالة",
    "started": "تاريخ البداية",
    "view": "عرض",
    "noRecords": "لا توجد سجلات",
    "selectEmployee": "اختر موظف",
    "chooseEmployee": "اختر موظف...",
    "offboardingReason": "سبب المغادرة",
    "reasonPlaceholder": "أدخل سبب إنهاء الخدمة...",
    "launchOnboarding": "بدء التعيين",
    "launchOffboarding": "بدء إنهاء الخدمة",
    "starting": "جاري البدء...",
    "tasksCompleted": "مهمة مكتملة",
    "pendingEmployee": "بانتظار الموظف",
    "pendingManager": "بانتظار المدير",
    "manager": "مدير",
    "complete": "إكمال",
    "pending": "قيد الانتظار",
    "employeeTitle": "التعيين الخاص بي",
    "employeeSubtitle": "أكمل مهام التعيين الخاصة بك",
    "yourChecklist": "قائمة مهام التعيين",
    "remaining": "متبقي",
    "form": "نموذج",
    "document": "مستند",
    "fillForm": "تعبئة النموذج",
    "upload": "رفع",
    "noActiveOnboarding": "لا توجد مهام تعيين نشطة"
  },
```

Add nav keys in Arabic:

```json
    "onboarding": "التعيين",
    "myOnboarding": "التعيين الخاص بي",
```

---

### Task 11: Verify Build

- [ ] **Step 1: Run TypeScript check**

```powershell
npx tsc --noEmit
```
Expected: No type errors.

- [ ] **Step 2: Run the build**

```powershell
npm run build
```
Expected: All routes compile. 25+ routes with no errors.

- [ ] **Step 3: Run seed to populate tasks**

```powershell
npx tsx prisma/seed.ts
```
Expected: Seed runs without error. Onboarding/offboarding task templates created.

- [ ] **Step 4: Restart dev server and verify**

```powershell
npm run dev
```
Visit `http://localhost:3000/en/manager/onboarding` as admin. Verify you see the list, can start onboarding for an employee, and the detail page loads.
