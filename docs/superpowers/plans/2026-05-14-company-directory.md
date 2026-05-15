# Company Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Company Directory page with org structure and employee cards.

**Architecture:** New server component fetches employees grouped by department, passes to client component for interactive search/filter/detail slideover. Reuses existing `Avatar` from shared components. No DB schema changes.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, lucide-react, next-intl

---

### Task 1: Add directory nav translations

**Files:**
- Modify: `src/i18n/messages/en.json:11`
- Modify: `src/i18n/messages/ar.json:11`

- [ ] **Step 1: Add "directory" to English nav**

Edit `src/i18n/messages/en.json`, add `"directory": "Directory"` after `"documents"`:

```json
    "documents": "Documents",
    "directory": "Directory",
    "signOut": "Sign Out"
```

- [ ] **Step 2: Add "directory" to Arabic nav**

Edit `src/i18n/messages/ar.json`, add `"directory": "دليل الموظفين"` after `"documents"`:

```json
    "documents": "المستندات",
    "directory": "دليل الموظفين",
    "signOut": "تسجيل الخروج"
```

---

### Task 2: Add directory nav item to sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add AddressBook icon import**

Add `AddressBook` to the lucide-react imports in `src/components/layout/sidebar.tsx`:

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
  AddressBook,
} from 'lucide-react'
```

- [ ] **Step 2: Add directory nav item**

In `src/components/layout/sidebar.tsx`, add directory nav item between dashboard and employees:

```typescript
const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard', show: true },
  { href: '/directory', icon: AddressBook, label: 'directory', show: true },
  { href: '/employees', icon: Users, label: 'employees', show: isAdmin },
  // ...rest unchanged
]
```

---

### Task 3: Create directory page (server component)

**Files:**
- Create: `src/app/[locale]/(hr)/directory/page.tsx`

- [ ] **Step 1: Create the server component**

`src/app/[locale]/(hr)/directory/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { DirectoryClient } from './directory-client'

export const dynamic = 'force-dynamic'

export default async function DirectoryPage() {
  const session = await auth()
  if (!session?.user) return null

  const employees = await db.employee.findMany({
    include: {
      user: { select: { email: true, isActive: true, role: true } },
    },
    orderBy: [{ department: 'asc' }, { firstName: 'asc' }],
  })

  const isManager = (role: string) => role === 'HR_ADMIN' || role === 'MANAGER'

  const managers = employees.filter((e) => isManager(e.user.role) && e.user.isActive)
  const staff = employees.filter((e) => !isManager(e.user.role) && e.user.isActive)

  const map = (e: typeof employees[0]) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    jobTitle: e.jobTitle,
    department: e.department,
    employeeCode: e.employeeCode,
    email: e.user.email,
    phone: e.phone,
    emergencyContact: e.emergencyContact,
    emergencyPhone: e.emergencyPhone,
    joinDate: e.joinDate?.toISOString() ?? null,
    isManager: isManager(e.user.role),
  })

  return <DirectoryClient managers={managers.map(map)} staff={staff.map(map)} />
}
```

---

### Task 4: Create directory client component

**Files:**
- Create: `src/components/directory/directory-client.tsx`
- Create: `src/components/directory/employee-card.tsx`
- Create: `src/components/directory/employee-detail.tsx`

- [ ] **Step 1: Create directory-client.tsx**

`src/components/directory/directory-client.tsx`:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmployeeCard } from './employee-card'
import { EmployeeDetail } from './employee-detail'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  employeeCode: string
  email: string
  phone: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  joinDate: string | null
  isManager: boolean
}

interface Props {
  managers: EmployeeData[]
  staff: EmployeeData[]
}

export function DirectoryClient({ managers, staff }: Props) {
  const t = useTranslations('directory')
  const [query, setQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [selected, setSelected] = useState<EmployeeData | null>(null)

  const allEmployees = useMemo(() => [...managers, ...staff], [managers, staff])

  const departments = useMemo(
    () => [...new Set(allEmployees.map((e) => e.department))].sort(),
    [allEmployees]
  )

  const filterFn = (e: EmployeeData) => {
    if (deptFilter && e.department !== deptFilter) return false
    if (query) {
      const q = query.toLowerCase()
      return (
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q)
      )
    }
    return true
  }

  const filteredManagers = useMemo(() => managers.filter(filterFn), [managers, deptFilter, query])
  const filteredStaff = useMemo(() => staff.filter(filterFn), [staff, deptFilter, query])

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeData[]>()
    for (const emp of filteredStaff) {
      const dept = emp.department || 'Other'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(emp)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredStaff])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ledger-text-muted" />
          <Input
            name="q"
            placeholder={t('search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <select
          className="rounded border bg-card px-3 py-2 text-sm"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">{t('allDepartments')}</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="space-y-8">
        {filteredManagers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-warning-amber uppercase tracking-wider mb-3">
              {t('management')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredManagers.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onClick={() => setSelected(emp)}
                  variant="gold"
                />
              ))}
            </div>
          </div>
        )}
        {grouped.map(([dept, emps]) => (
          <div key={dept}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {dept} ({emps.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {emps.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onClick={() => setSelected(emp)}
                />
              ))}
            </div>
          </div>
        ))}
        {filteredManagers.length === 0 && grouped.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            {t('noResults')}
          </div>
        )}
      </div>

      {selected && (
        <EmployeeDetail
          employee={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create employee-card.tsx**

`src/components/directory/employee-card.tsx`:

```typescript
'use client'

import { Avatar } from '@/components/shared'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  employeeCode: string
  email: string
  phone: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  joinDate: string | null
}

interface Props {
  employee: EmployeeData
  onClick: () => void
  variant?: 'default' | 'gold'
}

export function EmployeeCard({ employee: e, onClick, variant = 'default' }: Props) {
  const ini = `${e.firstName[0]}${e.lastName[0]}`.toUpperCase()

  const borderCls = variant === 'gold'
    ? 'border-[rgba(212,168,67,0.3)] bg-[rgba(212,168,67,0.04)]'
    : 'border-[rgba(255,255,255,0.065)] bg-[#0D1028]'

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 rounded-xl ${borderCls} p-4 text-start transition-all duration-150 hover:border-[rgba(255,255,255,0.13)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer`}
    >
      <Avatar ini={ini} sz={44} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-[#E0E6F4] truncate">
          {e.firstName} {e.lastName}
        </div>
        <div className="text-[12.5px] text-muted-foreground truncate mt-0.5">
          {e.jobTitle}
        </div>
        <div className="mt-1">
          <span className="inline-block text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[rgba(212,168,67,0.12)] text-[#D4A843] border border-[rgba(212,168,67,0.2)]">
            {e.department}
          </span>
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 3: Create employee-detail.tsx**

`src/components/directory/employee-detail.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Mail, Phone, Hash, Calendar, AlertTriangle } from 'lucide-react'
import { Avatar } from '@/components/shared'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  employeeCode: string
  email: string
  phone: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  joinDate: string | null
}

interface Props {
  employee: EmployeeData
  onClose: () => void
}

export function EmployeeDetail({ employee: e, onClose }: Props) {
  const t = useTranslations('directory')

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const ini = `${e.firstName[0]}${e.lastName[0]}`.toUpperCase()

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 end-0 z-50 w-full max-w-sm bg-[#0D1028] border-s border-[rgba(255,255,255,0.065)] shadow-2xl overflow-y-auto animate-slide-in">
        <div className="p-6">
          <div className="flex justify-between items-start mb-8">
            <Avatar ini={ini} sz={56} />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-[#E0E6F4] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <h2 className="text-xl font-bold text-[#E0E6F4] font-syne">
            {e.firstName} {e.lastName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{e.jobTitle}</p>
          <div className="mt-3">
            <span className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-full bg-[rgba(212,168,67,0.12)] text-[#D4A843] border border-[rgba(212,168,67,0.2)]">
              {e.department}
            </span>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-muted-foreground shrink-0" />
              <a href={`mailto:${e.email}`} className="text-inquiry-blue hover:underline truncate">
                {e.email}
              </a>
            </div>
            {e.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-muted-foreground shrink-0" />
                <span className="text-[#E0E6F4]">{e.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Hash size={16} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{e.employeeCode}</span>
            </div>
            {e.joinDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  {new Date(e.joinDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {(e.emergencyContact || e.emergencyPhone) && (
            <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.065)]">
              <div className="flex items-center gap-2 text-sm font-medium text-warning-amber mb-3">
                <AlertTriangle size={14} />
                {t('emergencyContact')}
              </div>
              {e.emergencyContact && (
                <p className="text-sm text-[#E0E6F4]">{e.emergencyContact}</p>
              )}
              {e.emergencyPhone && (
                <p className="text-sm text-muted-foreground mt-1">{e.emergencyPhone}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
```

---

### Task 5: Add directory translations

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/ar.json`

- [ ] **Step 1: Add English translations**

Add to `src/i18n/messages/en.json`:

```json
  "directory": {
    "title": "Directory",
    "search": "Search employees...",
    "allDepartments": "All Departments",
    "management": "Management",
    "noResults": "No employees found matching your search.",
    "emergencyContact": "Emergency Contact"
  },
```

- [ ] **Step 2: Add Arabic translations**

Add to `src/i18n/messages/ar.json`:

```json
  "directory": {
    "title": "دليل الموظفين",
    "search": "بحث عن موظف...",
    "allDepartments": "جميع الأقسام",
    "management": "الإدارة",
    "noResults": "لم يتم العثور على موظفين مطابقين لبحثك.",
    "emergencyContact": "جهة اتصال طوارئ"
  },
```

---

### Task 6: Verify build

- [ ] **Step 1: Run build**

```bash
cd "E:\riman hr management v2" && npm run build
```

Expected: All 25 routes compile with 0 errors.
