3534eaa feat: HR-managed public holiday admin page
 .../(hr)/manager/holidays/holidays-client.tsx      | 90 ++++++++++++++++++++++
 src/app/[locale]/(hr)/manager/holidays/page.tsx    | 16 ++++
 src/components/layout/sidebar.tsx                  |  1 +
 src/i18n/messages/ar.json                          | 11 +++
 src/i18n/messages/en.json                          | 11 +++
 src/lib/actions/holiday.ts                         | 40 ++++++++++
 src/lib/queries/holiday.ts                         |  6 ++
 src/lib/validations/holiday.ts                     | 11 +++
 8 files changed, 186 insertions(+)
diff --git a/src/app/[locale]/(hr)/manager/holidays/holidays-client.tsx b/src/app/[locale]/(hr)/manager/holidays/holidays-client.tsx
new file mode 100644
index 0000000..00b1ee0
--- /dev/null
+++ b/src/app/[locale]/(hr)/manager/holidays/holidays-client.tsx
@@ -0,0 +1,90 @@
+'use client'
+
+/* eslint-disable @typescript-eslint/no-explicit-any */
+
+import { useState } from 'react'
+import { useTranslations } from 'next-intl'
+import { toast } from 'sonner'
+import { Button } from '@/components/ui/button'
+import { Input } from '@/components/ui/input'
+import { createHoliday, deleteHoliday } from '@/lib/actions/holiday'
+import { Trash2 } from 'lucide-react'
+
+interface HolidaysClientProps {
+  holidays: any[]
+}
+
+export default function HolidaysClient({ holidays }: HolidaysClientProps) {
+  const t = useTranslations('holidays')
+  const [saving, setSaving] = useState(false)
+
+  async function handleCreate(formData: FormData) {
+    setSaving(true)
+    const res = await createHoliday(formData)
+    if (res?.error) toast.error(res.error)
+    setSaving(false)
+  }
+
+  async function handleDelete(formData: FormData) {
+    const res = await deleteHoliday(formData)
+    if (res?.error) toast.error(res.error)
+  }
+
+  return (
+    <div className="space-y-6">
+      <h1 className="text-2xl font-bold">{t('title')}</h1>
+
+      <div className="rounded-lg border bg-[#0D1028] p-5 max-w-md">
+        <h2 className="mb-4 font-medium">{t('addTitle')}</h2>
+        <form action={handleCreate} className="space-y-3">
+          <Input name="name" placeholder={t('name')} required maxLength={100} />
+          <Input name="nameAr" placeholder={t('nameAr')} maxLength={100} />
+          <Input name="date" type="date" required />
+          <Button type="submit" size="xs" disabled={saving}>
+            {t('add')}
+          </Button>
+        </form>
+      </div>
+
+      <div className="overflow-x-auto rounded-lg border bg-[#0D1028]">
+        <table className="w-full text-sm">
+          <thead>
+            <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
+              <th className="p-3 font-medium">{t('date')}</th>
+              <th className="p-3 font-medium">{t('name')}</th>
+              <th className="p-3 font-medium">{t('nameAr')}</th>
+              <th className="p-3 font-medium" />
+            </tr>
+          </thead>
+          <tbody>
+            {holidays.length === 0 ? (
+              <tr>
+                <td colSpan={4} className="p-3 text-center text-[#8B93A8]">
+                  {t('empty')}
+                </td>
+              </tr>
+            ) : (
+              holidays.map((holiday) => (
+                <tr key={holiday.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
+                  <td className="p-3">
+                    {new Date(holiday.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
+                  </td>
+                  <td className="p-3 font-medium">{holiday.name}</td>
+                  <td className="p-3">{holiday.nameAr || '-'}</td>
+                  <td className="p-3 text-end">
+                    <form action={handleDelete}>
+                      <input type="hidden" name="id" value={holiday.id} />
+                      <Button type="submit" size="xs" variant="ghost" aria-label={t('delete')}>
+                        <Trash2 className="h-3 w-3 text-[#EF4444]" />
+                      </Button>
+                    </form>
+                  </td>
+                </tr>
+              ))
+            )}
+          </tbody>
+        </table>
+      </div>
+    </div>
+  )
+}
diff --git a/src/app/[locale]/(hr)/manager/holidays/page.tsx b/src/app/[locale]/(hr)/manager/holidays/page.tsx
new file mode 100644
index 0000000..7a90558
--- /dev/null
+++ b/src/app/[locale]/(hr)/manager/holidays/page.tsx
@@ -0,0 +1,16 @@
+import { auth } from '@/lib/auth'
+import { redirect } from 'next/navigation'
+import { getHolidays } from '@/lib/queries/holiday'
+import HolidaysClient from './holidays-client'
+export const dynamic = 'force-dynamic'
+
+export default async function HolidaysPage({ params }: { params: Promise<{ locale: string }> }) {
+  const { locale } = await params
+  const session = await auth()
+  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN'))
+    redirect(`/${locale}/auth/signin`)
+  if (session.user.role !== 'HR_ADMIN') redirect(`/${locale}/dashboard`)
+
+  const holidays = await getHolidays()
+  return <HolidaysClient holidays={JSON.parse(JSON.stringify(holidays))} />
+}
diff --git a/src/components/layout/sidebar.tsx b/src/components/layout/sidebar.tsx
index 8c23bde..107be0c 100644
--- a/src/components/layout/sidebar.tsx
+++ b/src/components/layout/sidebar.tsx
@@ -56,20 +56,21 @@ export default function Sidebar({ role }: { role: string }) {
     { href: `/${locale}/manager/leaves`, icon: CalendarRange, label: 'leaveRequests', show: isAdmin },
     { href: `/${locale}/attendance`, icon: Clock, label: 'attendance', show: true },
     { href: `/${locale}/manager/attendance`, icon: ListChecks, label: 'managerAttendance', show: isAdmin },
     { href: `/${locale}/manager/payroll`, icon: Banknote, label: 'payroll', show: isAdmin },
     { href: `/${locale}/manager/performance`, icon: BarChart3, label: 'performance', show: isAdmin },
     { href: `/${locale}/manager/analytics`, icon: BarChart3, label: 'analytics', show: isAdmin },
     { href: `/${locale}/manager/documents`, icon: FolderOpen, label: 'documents', show: isAdmin },
     { href: `/${locale}/manager/surveys`, icon: ClipboardList, label: 'surveys', show: isAdmin },
     { href: `/${locale}/manager/assets`, icon: Package, label: 'assets', show: isAdmin },
     { href: `/${locale}/manager/expenses`, icon: Receipt, label: 'expenses', show: isAdmin },
+    { href: `/${locale}/manager/holidays`, icon: CalendarRange, label: 'holidays', show: isAdmin },
     { href: `/${locale}/surveys`, icon: ClipboardList, label: 'mySurveys', show: isEmployee },
     { href: `/${locale}/assets`, icon: Package, label: 'myAssets', show: isEmployee },
     { href: `/${locale}/expenses`, icon: Receipt, label: 'myExpenses', show: isEmployee },
   ].filter((item) => item.show)
 
   const sidebarContent = (
     <>
       <div className={cn("flex items-center h-14 border-b border-[rgba(255,255,255,0.065)]", collapsed ? "justify-center px-0" : "px-5")}>
         <Link href={`/${locale}/dashboard`} className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
           <div className="w-7 h-7 rounded-md bg-[#D4A843] flex items-center justify-center flex-shrink-0">
diff --git a/src/i18n/messages/ar.json b/src/i18n/messages/ar.json
index e7fc66b..aafda30 100644
--- a/src/i18n/messages/ar.json
+++ b/src/i18n/messages/ar.json
@@ -22,20 +22,21 @@
     "notifications": "╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬",
     "onboarding": "╪º┘ä╪¬╪╣┘è┘è┘å",
     "myOnboarding": "╪º┘ä╪¬╪╣┘è┘è┘å ╪º┘ä╪«╪º╪╡ ╪¿┘è",
     "surveys": "╪º┘ä╪º╪│╪¬╪¿┘è╪º┘å╪º╪¬",
     "mySurveys": "╪º╪│╪¬╪¿┘è╪º┘å╪º╪¬┘è",
     "assets": "╪º┘ä╪ú╪╡┘ê┘ä",
     "myAssets": "╪ú╪╡┘ê┘ä┘è",
     "expenses": "╪º┘ä┘à╪╡╪▒┘ê┘ü╪º╪¬",
     "myExpenses": "┘à╪╡╪▒┘ê┘ü╪º╪¬┘è",
     "analytics": "╪º┘ä╪¬╪¡┘ä┘è┘ä╪º╪¬",
+    "holidays": "╪º┘ä╪╣╪╖┘ä╪º╪¬ ╪º┘ä╪▒╪│┘à┘è╪⌐",
     "signOut": "╪¬╪│╪¼┘è┘ä ╪º┘ä╪«╪▒┘ê╪¼",
     "collapse": "╪╖┘è"
   },
   "dashboard": {
     "title": "┘ä┘ê╪¡╪⌐ ╪º┘ä╪¬╪¡┘â┘à",
     "totalEmployees": "╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à┘ê╪╕┘ü┘è┘å",
     "pendingLeaves": "╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪Ñ╪¼╪º╪▓╪º╪¬ ╪º┘ä┘à╪╣┘ä┘é╪⌐",
     "todayAttendance": "╪¡╪╢┘ê╪▒ ╪º┘ä┘è┘ê┘à",
     "present": "╪¡╪º╪╢╪▒",
     "addEmployee": "╪Ñ╪╢╪º┘ü╪⌐ ┘à┘ê╪╕┘ü",
@@ -183,20 +184,30 @@
     "title": "╪ú┘å┘ê╪º╪╣ ╪º┘ä╪Ñ╪¼╪º╪▓╪º╪¬",
     "enable": "╪¬┘ü╪╣┘è┘ä",
     "disable": "╪¬╪╣╪╖┘è┘ä",
     "editAllocation": "╪¬╪╣╪»┘è┘ä ╪º┘ä╪▒╪╡┘è╪»",
     "employee": "╪º┘ä┘à┘ê╪╕┘ü",
     "currentBalance": "╪º┘ä╪▒╪╡┘è╪» ╪º┘ä╪¡╪º┘ä┘è",
     "setAllocation": "╪¬╪¡╪»┘è╪» ╪º┘ä╪▒╪╡┘è╪» ╪º┘ä╪│┘å┘ê┘è",
     "save": "╪¡┘ü╪╕",
     "saving": "╪¼╪º╪▒┘è ╪º┘ä╪¡┘ü╪╕..."
   },
+  "holidays": {
+    "title": "╪º┘ä╪╣╪╖┘ä╪º╪¬ ╪º┘ä╪▒╪│┘à┘è╪⌐",
+    "addTitle": "╪Ñ╪╢╪º┘ü╪⌐ ╪╣╪╖┘ä╪⌐",
+    "name": "╪º┘ä╪º╪│┘à",
+    "nameAr": "╪º┘ä╪º╪│┘à ╪¿╪º┘ä╪╣╪▒╪¿┘è╪⌐",
+    "date": "╪º┘ä╪¬╪º╪▒┘è╪«",
+    "add": "╪Ñ╪╢╪º┘ü╪⌐",
+    "delete": "╪¡╪░┘ü",
+    "empty": "┘ä╪º ╪¬┘ê╪¼╪» ╪╣╪╖┘ä╪º╪¬ ┘à╪¡╪»╪»╪⌐"
+  },
   "attendance": {
     "title": "╪º┘ä╪¡╪╢┘ê╪▒ ┘ê╪º┘ä╪º┘å╪╡╪▒╪º┘ü",
     "checkIn": "╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä",
     "checkOut": "╪¬╪│╪¼┘è┘ä ╪º┘ä╪«╪▒┘ê╪¼",
     "manualCheckIn": "╪¬╪│╪¼┘è┘ä ╪»╪«┘ê┘ä ┘è╪»┘ê┘è",
     "alreadyCheckedIn": "╪¬┘à ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä ╪º┘ä┘è┘ê┘à ╪¿╪º┘ä┘ü╪╣┘ä",
     "notCheckedIn": "┘ä┘à ┘è╪¬┘à ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä ╪¿╪╣╪»",
     "alreadyCheckedOut": "╪¬┘à ╪¬╪│╪¼┘è┘ä ╪º┘ä╪«╪▒┘ê╪¼ ╪º┘ä┘è┘ê┘à ╪¿╪º┘ä┘ü╪╣┘ä",
     "checkedInAt": "┘ê┘é╪¬ ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä",
     "checkedOutAt": "┘ê┘é╪¬ ╪¬╪│╪¼┘è┘ä ╪º┘ä╪«╪▒┘ê╪¼",
diff --git a/src/i18n/messages/en.json b/src/i18n/messages/en.json
index a5592c3..573ef94 100644
--- a/src/i18n/messages/en.json
+++ b/src/i18n/messages/en.json
@@ -22,20 +22,21 @@
     "notifications": "Notifications",
     "onboarding": "Onboarding",
     "myOnboarding": "My Onboarding",
     "surveys": "Surveys",
     "mySurveys": "My Surveys",
     "assets": "Assets",
     "myAssets": "My Assets",
     "expenses": "Expenses",
     "myExpenses": "My Expenses",
     "analytics": "Analytics",
+    "holidays": "Holidays",
     "signOut": "Sign Out",
     "collapse": "Collapse"
   },
   "dashboard": {
     "title": "Dashboard",
     "totalEmployees": "Total Employees",
     "pendingLeaves": "Pending Leave Requests",
     "todayAttendance": "Today's Attendance",
     "present": "present",
     "addEmployee": "Add Employee",
@@ -183,20 +184,30 @@
     "title": "Leave Types",
     "enable": "Enable",
     "disable": "Disable",
     "editAllocation": "Edit Allocation",
     "employee": "Employee",
     "currentBalance": "Current Balance",
     "setAllocation": "Set Annual Allocation",
     "save": "Save Allocation",
     "saving": "Saving..."
   },
+  "holidays": {
+    "title": "Holidays",
+    "addTitle": "Add holiday",
+    "name": "Name",
+    "nameAr": "Name (Arabic)",
+    "date": "Date",
+    "add": "Add",
+    "delete": "Delete",
+    "empty": "No holidays defined"
+  },
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
diff --git a/src/lib/actions/holiday.ts b/src/lib/actions/holiday.ts
new file mode 100644
index 0000000..95c5408
--- /dev/null
+++ b/src/lib/actions/holiday.ts
@@ -0,0 +1,40 @@
+'use server'
+
+import { serverError } from '@/lib/errors'
+import { db } from '@/lib/db'
+import { createHolidaySchema, deleteHolidaySchema } from '@/lib/validations/holiday'
+import { auth } from '@/lib/auth'
+import { revalidatePath } from 'next/cache'
+
+export async function createHoliday(formData: FormData) {
+  const session = await auth()
+  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }
+
+  const parsed = createHolidaySchema.safeParse(Object.fromEntries(formData))
+  if (!parsed.success) {
+    return { error: await serverError('validationFailed'), fieldErrors: parsed.error.flatten().fieldErrors }
+  }
+
+  try {
+    await db.holiday.create({
+      data: { name: parsed.data.name, nameAr: parsed.data.nameAr || null, date: new Date(parsed.data.date) },
+    })
+  } catch (e) {
+    const isUnique = typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002'
+    if (isUnique) return { error: await serverError('invalidRequest'), fieldErrors: {} }
+    throw e
+  }
+
+  revalidatePath('/manager/holidays')
+}
+
+export async function deleteHoliday(formData: FormData) {
+  const session = await auth()
+  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }
+
+  const parsed = deleteHolidaySchema.safeParse(Object.fromEntries(formData))
+  if (!parsed.success) return { error: await serverError('invalidRequest') }
+
+  await db.holiday.delete({ where: { id: parsed.data.id } })
+  revalidatePath('/manager/holidays')
+}
diff --git a/src/lib/queries/holiday.ts b/src/lib/queries/holiday.ts
new file mode 100644
index 0000000..7038924
--- /dev/null
+++ b/src/lib/queries/holiday.ts
@@ -0,0 +1,6 @@
+import { db } from '@/lib/db'
+import type { Holiday } from '@prisma/client'
+
+export async function getHolidays(): Promise<Holiday[]> {
+  return db.holiday.findMany({ orderBy: { date: 'asc' } })
+}
diff --git a/src/lib/validations/holiday.ts b/src/lib/validations/holiday.ts
new file mode 100644
index 0000000..7ec2d49
--- /dev/null
+++ b/src/lib/validations/holiday.ts
@@ -0,0 +1,11 @@
+import { z } from 'zod'
+
+export const createHolidaySchema = z.object({
+  name: z.string().min(1, 'Required').max(100),
+  nameAr: z.string().max(100).optional(),
+  date: z.string().min(1, 'Required'),
+})
+
+export const deleteHolidaySchema = z.object({
+  id: z.string().min(1),
+})
