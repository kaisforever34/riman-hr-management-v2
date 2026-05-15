# Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add in-app notifications triggered by leave and onboarding/offboarding actions, with a bell icon in the header and a notification list page.

**Architecture:** Single Prisma model (Notification), polling API route (`/api/notifications/unread-count`), server actions for create/list/markRead, notification bell component in header, notification list page at `/[locale]/notifications`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma v5, Tailwind v4, next-intl, lucide-react

---

### Task 1: Add Notification Model

**Files:**
- Modify: `prisma/schema.prisma`

Add after the `model VerificationToken` block (end of file):

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "LEAVE_SUBMITTED" | "LEAVE_APPROVED" | "LEAVE_REJECTED" | "ONBOARDING_TASK" | "OFFBOARDING_TASK" | "GENERAL"
  title     String
  message   String?
  link      String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Run:
```powershell
npx prisma migrate dev --name add_notifications
```

---

### Task 2: Create Notification Server Actions

**Files:**
- Create: `src/lib/actions/notifications.ts`

```typescript
'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message?: string,
  link?: string,
) {
  await db.notification.create({
    data: { userId, type, title, message: message ?? null, link: link ?? null },
  })
}

export async function getUnreadCount() {
  const session = await auth()
  if (!session?.user) return { count: 0, recent: [] }

  const [count, recent] = await Promise.all([
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return { count, recent: JSON.parse(JSON.stringify(recent)) }
}

export async function getNotifications(page = 1, unreadOnly = false) {
  const session = await auth()
  if (!session?.user) return { notifications: [], total: 0 }

  const where = { userId: session.user.id, ...(unreadOnly ? { isRead: false } : {}) }
  const pageSize = 20

  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notification.count({ where }),
  ])

  return { notifications: JSON.parse(JSON.stringify(notifications)), total }
}

export async function markAsRead(id: string) {
  const session = await auth()
  if (!session?.user) return

  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  })
  revalidatePath('/notifications')
}

export async function markAllAsRead() {
  const session = await auth()
  if (!session?.user) return

  await db.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })
  revalidatePath('/notifications')
}
```

---

### Task 3: Create API Route for Polling

**Files:**
- Create: `src/app/api/notifications/unread-count/route.ts`

```typescript
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ count: 0, recent: [] })

  const [count, recent] = await Promise.all([
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return NextResponse.json({ count, recent })
}
```

---

### Task 4: Add Notifications to Leave Actions

**Files:**
- Modify: `src/lib/actions/leave.ts`

Find the `approveLeave` function. After the success block where the leave is approved, add:

```typescript
import { createNotification } from './notifications'
```

And after the approval succeeds (after the `revalidatePath` or similar), add:

```typescript
  const leaveRequest = await db.leaveRequest.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  })
  if (leaveRequest) {
    await createNotification(
      leaveRequest.employee.user.id,
      'LEAVE_APPROVED',
      'Leave Approved',
      `Your ${leaveRequest.leaveType?.name ?? ''} leave from ${formatDate(leaveRequest.startDate)} to ${formatDate(leaveRequest.endDate)} has been approved.`,
      `/leave/${id}`,
    )
  }
```

Similarly in `rejectLeave`:

```typescript
  if (leaveRequest) {
    await createNotification(
      leaveRequest.employee.user.id,
      'LEAVE_REJECTED',
      'Leave Rejected',
      `Your ${leaveRequest.leaveType?.name ?? ''} leave request has been rejected.${leaveRequest.rejectReason ? ` Reason: ${leaveRequest.rejectReason}` : ''}`,
      `/leave/${id}`,
    )
  }
```

And in `submitLeave`, after successful creation, notify managers:

```typescript
  // Notify all managers
  const managers = await db.user.findMany({
    where: { role: { in: ['HR_ADMIN', 'MANAGER'] }, isActive: true },
  })
  for (const manager of managers) {
    await createNotification(
      manager.id,
      'LEAVE_SUBMITTED',
      'New Leave Request',
      `${employee.firstName} ${employee.lastName} requested ${leaveType.name} leave.`,
      `/manager/leaves/${created.id}`,
    )
  }
```

Note: Add imports for `createNotification` and `Employee` lookup.

---

### Task 5: Add Notifications to Onboarding Actions

**Files:**
- Modify: `src/lib/actions/onboarding.ts`

At the top, import:
```typescript
import { createNotification } from './notifications'
```

In `startOnboarding`, after the onboarding record is created, add:

```typescript
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  })
  if (employee) {
    await createNotification(
      employee.user.id,
      type === 'ONBOARDING' ? 'ONBOARDING_TASK' : 'OFFBOARDING_TASK',
      type === 'ONBOARDING' ? 'Onboarding Started' : 'Offboarding Started',
      `Your ${type.toLowerCase()} process has been started. Please complete your tasks.`,
      '/onboarding',
    )
  }
```

In `completeOnboardingTask`, after the task is completed (and if assignedTo is EMPLOYEE), add:

```typescript
  if (task.assignedTo === 'EMPLOYEE') {
    const managers = await db.user.findMany({
      where: { role: { in: ['HR_ADMIN', 'MANAGER'] }, isActive: true },
    })
    for (const manager of managers) {
      await createNotification(
        manager.id,
        'ONBOARDING_TASK',
        'Task Completed',
        `${task.onboarding.employee.firstName} ${task.onboarding.employee.lastName} completed: ${task.taskTemplate.titleEn}`,
        `/manager/${task.onboarding.type.toLowerCase()}/${task.onboardingId}`,
      )
    }
  }
```

---

### Task 6: Add Notification Bell to Header

**Files:**
- Modify: `src/components/layout/header.tsx`

Read the current header file to understand the structure. Add a notification bell component:

Create `src/components/notifications/notification-bell.tsx`:

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { markAllAsRead } from '@/lib/actions/notifications'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [recent, setRecent] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    async function fetchCount() {
      const res = await fetch('/api/notifications/unread-count')
      if (res.ok) {
        const data = await res.json()
        setCount(data.count)
        setRecent(data.recent || [])
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleMarkAllRead() {
    await markAllAsRead()
    setCount(0)
    setRecent([])
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
      >
        <Bell className="w-4 h-4 text-[#8B93A8]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#D4A843] text-[#07091A] text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-[rgba(255,255,255,0.065)] flex items-center justify-between">
            <span className="text-sm font-medium text-[#E0E6F4]">Notifications</span>
            {count > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-[#D4A843] hover:text-[#EFC254]">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 && (
              <div className="p-6 text-center text-[#8B93A8] text-sm">No new notifications</div>
            )}
            {recent.map((n) => (
              <Link
                key={n.id}
                href={`/${locale}${n.link || '#'}`}
                onClick={() => setOpen(false)}
                className="block p-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <div className="text-sm text-[#E0E6F4] font-medium">{n.title}</div>
                {n.message && <div className="text-xs text-[#8B93A8] mt-0.5 line-clamp-2">{n.message}</div>}
                <div className="text-[10px] text-[#5A6278] mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </Link>
            ))}
          </div>

          <Link
            href={`/${locale}/notifications`}
            onClick={() => setOpen(false)}
            className="block p-3 text-center text-sm text-[#D4A843] hover:text-[#EFC254] border-t border-[rgba(255,255,255,0.065)]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
```

Then in `src/components/layout/header.tsx`, import and add the bell before the user avatar/signout section.

---

### Task 7: Create Notifications List Page

**Files:**
- Create: `src/app/[locale]/(hr)/notifications/page.tsx`
- Create: `src/app/[locale]/(hr)/notifications/notifications-client.tsx`

**Server component** (`page.tsx`):

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getNotifications } from '@/lib/actions/notifications'
import NotificationsClient from './notifications-client'

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const data = await getNotifications()
  return <NotificationsClient initial={JSON.parse(JSON.stringify(data))} locale={locale} />
}
```

**Client component**:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { markAsRead, markAllAsRead, getNotifications } from '@/lib/actions/notifications'
import { CheckCheck, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationsClient({ initial, locale }: { initial: { notifications: Notification[]; total: number }; locale: string }) {
  const t = useTranslations('notifications')
  const router = useRouter()
  const [notifications, setNotifications] = useState(initial.notifications)
  const [total, setTotal] = useState(initial.total)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)

  async function handleMarkRead(id: string) {
    await markAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    router.refresh()
  }

  async function handleMarkAllRead() {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setTotal(0)
    router.refresh()
  }

  async function toggleFilter() {
    const newVal = !unreadOnly
    setUnreadOnly(newVal)
    const data = await getNotifications(1, newVal)
    setNotifications(data.notifications)
    setTotal(data.total)
    setPage(1)
  }

  const typeColors: Record<string, string> = {
    LEAVE_SUBMITTED: 'text-[#D4A843]',
    LEAVE_APPROVED: 'text-[#22A854]',
    LEAVE_REJECTED: 'text-[#EF4444]',
    ONBOARDING_TASK: 'text-[#3B82F6]',
    OFFBOARDING_TASK: 'text-[#A855F7]',
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFilter}
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${unreadOnly ? 'bg-[#D4A843] text-[#07091A]' : 'text-[#8B93A8] hover:text-[#E0E6F4]'}`}
          >
            {t('unreadOnly')}
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-sm text-[#D4A843] hover:text-[#EFC254]">
              <CheckCheck className="w-4 h-4" />
              {t('markAllRead')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {notifications.length === 0 && (
          <div className="py-12 text-center">
            <Bell className="w-8 h-8 text-[#5A6278] mx-auto mb-3" />
            <p className="text-[#8B93A8] text-sm">{t('empty')}</p>
          </div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              n.isRead
                ? 'bg-[#0D0F1A] border-[rgba(255,255,255,0.04)] opacity-60'
                : 'bg-[rgba(212,168,67,0.03)] border-[#D4A84322]'
            }`}
          >
            <Link
              href={`/${locale}${n.link || '#'}`}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg ${typeColors[n.type] || 'text-[#8B93A8]'}`}>●</span>
                <span className="text-sm font-medium text-[#E0E6F4]">{n.title}</span>
              </div>
              {n.message && <p className="text-xs text-[#8B93A8] mt-0.5 ml-5">{n.message}</p>}
              <p className="text-[10px] text-[#5A6278] mt-1 ml-5">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
            </Link>
            {!n.isRead && (
              <button
                onClick={() => handleMarkRead(n.id)}
                className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)] text-[#8B93A8] hover:text-[#D4A843] flex-shrink-0"
                title={t('markRead')}
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={async () => { const d = await getNotifications(page - 1, unreadOnly); setNotifications(d.notifications); setPage(page - 1) }}
            disabled={page <= 1}
            className="px-3 py-1 text-sm text-[#8B93A8] hover:text-[#E0E6F4] disabled:opacity-30"
          >
            {t('previous')}
          </button>
          <span className="px-3 py-1 text-sm text-[#8B93A8]">{page}</span>
          <button
            onClick={async () => { const d = await getNotifications(page + 1, unreadOnly); setNotifications(d.notifications); setPage(page + 1) }}
            disabled={page * 20 >= total}
            className="px-3 py-1 text-sm text-[#8B93A8] hover:text-[#E0E6F4] disabled:opacity-30"
          >
            {t('next')}
          </button>
        </div>
      )}
    </div>
  )
}
```

---

### Task 8: Add Sidebar Nav Item

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

Add `Bell` to lucide-react imports and add a nav item for notifications (visible to all roles):

```typescript
import { ... Bell, ... } from 'lucide-react'
```

Add after the directory entry:
```typescript
    { href: '/notifications', icon: Bell, label: 'notifications', show: true },
```

---

### Task 9: Add i18n Translations

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/ar.json`

In both files, add nav key:
```json
    "notifications": "Notifications",
```

And add a `notifications` section before `common`:
```json
  "notifications": {
    "title": "Notifications",
    "markRead": "Mark as read",
    "markAllRead": "Mark all as read",
    "unreadOnly": "Unread only",
    "empty": "No notifications yet",
    "previous": "Previous",
    "next": "Next"
  },
```

---

### Task 10: Verify Build

```powershell
npm run build
```
Expected: 32+ routes, no errors.
