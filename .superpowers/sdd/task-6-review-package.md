aeeb69d feat: shade non-working days and holidays on leave calendar
 .../(hr)/manager/leaves/calendar/calendar-client.tsx | 20 ++++++++++++++++++--
 .../[locale]/(hr)/manager/leaves/calendar/page.tsx   | 12 ++++++++++--
 2 files changed, 28 insertions(+), 4 deletions(-)
diff --git a/src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx b/src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx
index 4e3ecae..fa583c2 100644
--- a/src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx
+++ b/src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx
@@ -1,28 +1,32 @@
 'use client'
 
 /* eslint-disable @typescript-eslint/no-explicit-any */
 
 import { useState } from 'react'
 import { useTranslations } from 'next-intl'
 import { Button } from '@/components/ui/button'
 import { ChevronLeft, ChevronRight } from 'lucide-react'
+import { isWorkingDay, toUaeDateKey } from '@/lib/working-days'
 
 interface CalendarClientProps {
   requests: any[]
+  holidays: any[]
   locale: string
 }
 
-export default function CalendarClient({ requests }: CalendarClientProps) {
+export default function CalendarClient({ requests, holidays }: CalendarClientProps) {
   const t = useTranslations('managerLeaves')
   const [currentDate, setCurrentDate] = useState(new Date())
 
+  const holidaySet = new Set(holidays.map((h: any) => toUaeDateKey(new Date(h.date))))
+
   const year = currentDate.getFullYear()
   const month = currentDate.getMonth()
   const firstDay = new Date(year, month, 1).getDay()
   const daysInMonth = new Date(year, month + 1, 0).getDate()
   const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
   const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
 
   function getRequestsForDay(day: number) {
     return requests.filter((r: any) => {
       const start = new Date(r.startDate)
@@ -53,22 +57,34 @@ export default function CalendarClient({ requests }: CalendarClientProps) {
             <div key={d} className="p-2 text-center text-xs font-medium text-[#8B93A8]">{d}</div>
           ))}
         </div>
         <div className="grid grid-cols-7">
           {Array.from({ length: firstDay }).map((_, i) => (
             <div key={`empty-${i}`} className="min-h-24 border-b border-r p-1" />
           ))}
           {Array.from({ length: daysInMonth }).map((_, i) => {
             const day = i + 1
             const dayRequests = getRequestsForDay(day)
+            const dateKey = toUaeDateKey(new Date(year, month, day))
+            const relevantWeeks = new Set<string>(
+              (dayRequests.length > 0
+                ? dayRequests.map((r: any) => r.employee.workWeek)
+                : requests.map((r: any) => r.employee.workWeek))
+            )
+            const isNonWorking = [...relevantWeeks].every(
+              (ww) => !isWorkingDay(dateKey, ww as any, holidaySet)
+            )
             return (
-              <div key={day} className="min-h-24 border-b border-r p-1">
+              <div
+                key={day}
+                className={`min-h-24 border-b border-r p-1${isNonWorking ? ' opacity-40 bg-muted' : ''}`}
+              >
                 <p className="text-xs font-medium">{day}</p>
                 <div className="mt-1 space-y-0.5">
                   {dayRequests.map((r: any) => (
                     <div
                       key={r.id}
                       className="truncate rounded bg-[rgba(75,139,240,0.1)] px-1 py-0.5 text-[10px] text-[#4B8BF0]"
                       title={`${r.employee.firstName} ${r.employee.lastName} - ${r.leaveType.name}`}
                     >
                       {r.employee.firstName}
                     </div>
diff --git a/src/app/[locale]/(hr)/manager/leaves/calendar/page.tsx b/src/app/[locale]/(hr)/manager/leaves/calendar/page.tsx
index 28454f2..995158c 100644
--- a/src/app/[locale]/(hr)/manager/leaves/calendar/page.tsx
+++ b/src/app/[locale]/(hr)/manager/leaves/calendar/page.tsx
@@ -1,27 +1,35 @@
 import { auth } from '@/lib/auth'
 import { redirect } from 'next/navigation'
 import { db } from '@/lib/db'
+import { getHolidays } from '@/lib/queries/holiday'
 import CalendarClient from './calendar-client'
 export const dynamic = 'force-dynamic'
 
 
 export default async function LeaveCalendarPage({
   params,
 }: {
   params: Promise<{ locale: string }>
 }) {
   const { locale } = await params
   const session = await auth()
   if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) redirect(`/${locale}/auth/signin`)
 
   const requests = await db.leaveRequest.findMany({
     where: { status: 'APPROVED' },
     include: {
       leaveType: true,
-      employee: { select: { firstName: true, lastName: true } },
+      employee: { select: { firstName: true, lastName: true, workWeek: true } },
     },
     orderBy: { startDate: 'asc' },
   })
+  const holidays = await getHolidays()
 
-  return <CalendarClient requests={JSON.parse(JSON.stringify(requests))} locale={locale} />
+  return (
+    <CalendarClient
+      requests={JSON.parse(JSON.stringify(requests))}
+      holidays={JSON.parse(JSON.stringify(holidays))}
+      locale={locale}
+    />
+  )
 }
