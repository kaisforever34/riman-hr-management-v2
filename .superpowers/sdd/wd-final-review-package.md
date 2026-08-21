aeeb69d feat: shade non-working days and holidays on leave calendar
22b020f feat: per-employee weekly work pattern on employee forms
3534eaa feat: HR-managed public holiday admin page
143add8 feat: compute leave duration in working days
d5368a3 feat: add Employee.workWeek and Holiday table
caa51dd feat: working-days engine with UAE timezone date keys
 .../migration.sql                                  | 17 ++++
 prisma/schema.prisma                               | 10 +++
 src/app/[locale]/(hr)/employees/new/page.tsx       | 33 +++++++-
 .../(hr)/manager/holidays/holidays-client.tsx      | 90 ++++++++++++++++++++++
 src/app/[locale]/(hr)/manager/holidays/page.tsx    | 16 ++++
 .../manager/leaves/calendar/calendar-client.tsx    | 20 ++++-
 .../[locale]/(hr)/manager/leaves/calendar/page.tsx | 12 ++-
 src/components/layout/sidebar.tsx                  |  1 +
 src/i18n/messages/ar.json                          | 23 ++++++
 src/i18n/messages/en.json                          | 23 ++++++
 src/lib/__tests__/leave.test.ts                    | 38 ++++++++-
 src/lib/__tests__/working-days.test.ts             | 61 +++++++++++++++
 src/lib/actions/employee.ts                        | 17 +++-
 src/lib/actions/holiday.ts                         | 40 ++++++++++
 src/lib/actions/leave.ts                           | 13 +++-
 src/lib/errors.ts                                  |  2 +
 src/lib/queries/holiday.ts                         |  6 ++
 src/lib/validations/employee.ts                    |  1 +
 src/lib/validations/holiday.ts                     | 11 +++
 src/lib/validations/leave.ts                       | 21 +++--
 src/lib/working-days.ts                            | 29 +++++++
 21 files changed, 466 insertions(+), 18 deletions(-)
diff --git a/prisma/migrations/20260821091256_workweek_and_holidays/migration.sql b/prisma/migrations/20260821091256_workweek_and_holidays/migration.sql
new file mode 100644
index 0000000..456f9ab
--- /dev/null
+++ b/prisma/migrations/20260821091256_workweek_and_holidays/migration.sql
@@ -0,0 +1,17 @@
+-- AlterTable
+ALTER TABLE "Employee" ADD COLUMN     "workWeek" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4]::INTEGER[];
+
+-- CreateTable
+CREATE TABLE "Holiday" (
+    "id" TEXT NOT NULL,
+    "name" TEXT NOT NULL,
+    "nameAr" TEXT,
+    "date" TIMESTAMP(3) NOT NULL,
+    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
+    "updatedAt" TIMESTAMP(3) NOT NULL,
+
+    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
+);
+
+-- CreateIndex
+CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index 3256917..c8c9aba 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -106,20 +106,21 @@ model Employee {
   salary                Decimal        @db.Decimal(10, 2)
   bankName              String?
   iban                  String?
   swift                 String?
   emergencyContactName  String?
   emergencyContactPhone String?
   managerId             String?
   manager               Employee?      @relation("ManagerReports", fields: [managerId], references: [id], onDelete: SetNull)
   reports               Employee[]     @relation("ManagerReports")
   isActive              Boolean        @default(true)
+  workWeek              Int[]          @default([0, 1, 2, 3, 4])
   createdAt             DateTime       @default(now())
   updatedAt             DateTime       @updatedAt
   leaveRequests         LeaveRequest[]
   leaveBalances         LeaveBalance[]
   attendanceRecords     AttendanceRecord[]
   payslips              Payslip[]
   performanceReviews    PerformanceReview[]
   employeeDocuments     EmployeeDocument[]
   onboarding            EmployeeOnboarding[]
   surveyAssignments     SurveyAssignment[]
@@ -134,20 +135,29 @@ model LeaveType {
   defaultDays        Int            @default(0)
   requiresAttachment Boolean        @default(false)
   isPaid             Boolean        @default(true)
   isActive           Boolean        @default(true)
   createdAt          DateTime       @default(now())
   updatedAt          DateTime       @updatedAt
   leaveRequests      LeaveRequest[]
   leaveBalances      LeaveBalance[]
 }
 
+model Holiday {
+  id        String   @id @default(cuid())
+  name      String
+  nameAr    String?
+  date      DateTime @unique
+  createdAt DateTime @default(now())
+  updatedAt DateTime @updatedAt
+}
+
 model LeaveBalance {
   id          String    @id @default(cuid())
   employeeId  String
   leaveTypeId String
   yearStart   DateTime
   yearEnd     DateTime
   allocated   Int       @default(0)
   carriedOver Int       @default(0)
   used        Float     @default(0)
   employee    Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
diff --git a/src/app/[locale]/(hr)/employees/new/page.tsx b/src/app/[locale]/(hr)/employees/new/page.tsx
index db0d07e..e786c65 100644
--- a/src/app/[locale]/(hr)/employees/new/page.tsx
+++ b/src/app/[locale]/(hr)/employees/new/page.tsx
@@ -17,20 +17,30 @@ import {
   SelectValue,
 } from '@/components/ui/select'
 import { Badge } from '@/components/ui/badge'
 import { employeeFormSchema, type EmployeeFormData, departments, maritalStatuses, countries } from '@/lib/validations/employee'
 import { createEmployee } from '@/lib/actions/employee'
 import { ArrowLeft, ChevronDown, ChevronUp, Save } from 'lucide-react'
 import Link from 'next/link'
 
 type SectionKey = 'personal' | 'job' | 'bank' | 'emergency'
 
+const DAYS = [
+  { value: 0, key: 'sun' },
+  { value: 1, key: 'mon' },
+  { value: 2, key: 'tue' },
+  { value: 3, key: 'wed' },
+  { value: 4, key: 'thu' },
+  { value: 5, key: 'fri' },
+  { value: 6, key: 'sat' },
+] as const
+
 function generateEmployeeCode() {
   const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
   return `EMP-${num}`
 }
 
 export default function AddEmployeePage() {
   const t = useTranslations('employeesAdd')
   const tc = useTranslations('common')
   const { locale } = useParams<{ locale: string }>()
   const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
@@ -43,20 +53,21 @@ export default function AddEmployeePage() {
     register,
     handleSubmit,
     setValue,
     watch,
     formState: { errors },
   } = useForm<EmployeeFormData>({
     resolver: zodResolver(employeeFormSchema),
     defaultValues: {
       employeeCode: generateEmployeeCode(),
       role: 'EMPLOYEE',
+      workWeek: [0, 1, 2, 3, 4],
     },
   })
 
   function toggleSection(section: SectionKey) {
     setExpandedSections((prev) => {
       const next = new Set(prev)
       if (next.has(section)) {
         next.delete(section)
       } else {
         next.add(section)
@@ -64,21 +75,23 @@ export default function AddEmployeePage() {
       return next
     })
   }
 
   async function onSubmit(data: EmployeeFormData) {
     setServerError('')
     setLoading(true)
 
     const formData = new FormData()
     Object.entries(data).forEach(([key, value]) => {
-      if (value !== undefined && value !== null) {
+      if (Array.isArray(value)) {
+        value.forEach((v) => formData.append(key, String(v)))
+      } else if (value !== undefined && value !== null) {
         formData.append(key, value as string)
       }
     })
 
     const result = await createEmployee(formData)
 
     if (result?.error) {
       setServerError(result.error)
       setLoading(false)
     }
@@ -218,20 +231,38 @@ export default function AddEmployeePage() {
                   <Label>{t('role')} *</Label>
                   <Select onValueChange={(v) => setValue('role', (v ?? 'EMPLOYEE') as 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE')} value={watch('role')} disabled={loading}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="EMPLOYEE">Employee</SelectItem>
                       <SelectItem value="MANAGER">Manager</SelectItem>
                       <SelectItem value="HR_ADMIN">HR Admin</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
+                <div className="space-y-2 sm:col-span-2">
+                  <Label>{t('workWeek')} *</Label>
+                  <div className="flex flex-wrap gap-4">
+                    {DAYS.map((day) => (
+                      <label key={day.value} className="flex items-center gap-2 text-sm font-normal">
+                        <input
+                          type="checkbox"
+                          className="h-4 w-4"
+                          value={day.value}
+                          disabled={loading}
+                          {...register('workWeek')}
+                        />
+                        {t(`days.${day.key}`)}
+                      </label>
+                    ))}
+                  </div>
+                  {errors.workWeek && <p className="text-sm text-red-500">{errors.workWeek.message}</p>}
+                </div>
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* Section 3: Bank Details (optional) */}
         <Card>
           <CardContent className="p-0">
             <button
               type="button"
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
index 4fb79ba..7afffbb 100644
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
@@ -72,20 +73,30 @@
     "phoneNumber": "╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü",
     "dateOfBirth": "╪¬╪º╪▒┘è╪« ╪º┘ä┘à┘è┘ä╪º╪»",
     "nationality": "╪º┘ä╪¼┘å╪│┘è╪⌐",
     "maritalStatus": "╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪º╪¼╪¬┘à╪º╪╣┘è╪⌐",
     "employeeCode": "╪▒┘à╪▓ ╪º┘ä┘à┘ê╪╕┘ü",
     "jobTitle": "╪º┘ä┘à╪│┘à┘ë ╪º┘ä┘ê╪╕┘è┘ü┘è",
     "department": "╪º┘ä┘é╪│┘à",
     "hireDate": "╪¬╪º╪▒┘è╪« ╪º┘ä╪¬┘ê╪╕┘è┘ü",
     "salary": "╪º┘ä╪▒╪º╪¬╪¿ (╪»╪▒┘ç┘à)",
     "role": "╪º┘ä╪»┘ê╪▒",
+    "workWeek": "╪ú╪│╪¿┘ê╪╣ ╪º┘ä╪╣┘à┘ä",
+    "days": {
+      "sun": "╪º┘ä╪ú╪¡╪»",
+      "mon": "╪º┘ä╪º╪½┘å┘è┘å",
+      "tue": "╪º┘ä╪½┘ä╪º╪½╪º╪í",
+      "wed": "╪º┘ä╪ú╪▒╪¿╪╣╪º╪í",
+      "thu": "╪º┘ä╪«┘à┘è╪│",
+      "fri": "╪º┘ä╪¼┘à╪╣╪⌐",
+      "sat": "╪º┘ä╪│╪¿╪¬"
+    },
     "bankName": "╪º╪│┘à ╪º┘ä╪¿┘å┘â",
     "iban": "IBAN",
     "swift": "SWIFT/BIC",
     "emergencyContactName": "╪º╪│┘à ╪¼┘ç╪⌐ ╪º┘ä╪º╪¬╪╡╪º┘ä",
     "emergencyContactPhone": "┘ç╪º╪¬┘ü ╪¼┘ç╪⌐ ╪º┘ä╪º╪¬╪╡╪º┘ä",
     "save": "╪¡┘ü╪╕ ╪º┘ä┘à┘ê╪╕┘ü",
     "saving": "╪¼╪º╪▒┘è ╪º┘ä╪¡┘ü╪╕...",
     "success": "╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à┘ê╪╕┘ü ╪¿┘å╪¼╪º╪¡",
     "skip": "╪¬╪«╪╖┘è",
     "optional": "╪º╪«╪¬┘è╪º╪▒┘è"
@@ -183,20 +194,30 @@
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
@@ -637,20 +658,22 @@
     "codeExists": "┘è┘ê╪¼╪» ┘à┘ê╪╕┘ü ╪¿┘ç╪░╪º ╪º┘ä╪▒┘à╪▓ ╪¿╪º┘ä┘ü╪╣┘ä.",
     "emailOrCodeExists": "┘è┘ê╪¼╪» ┘à┘ê╪╕┘ü ╪¿┘ç╪░╪º ╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ╪º┘ä╪▒┘à╪▓ ╪¿╪º┘ä┘ü╪╣┘ä.",
     "validationFailed": "┘ü╪┤┘ä ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪º┘ä╪¿┘è╪º┘å╪º╪¬",
     "invalidInput": "╪Ñ╪»╪«╪º┘ä ╪║┘è╪▒ ╪╡╪º┘ä╪¡",
     "invalidRequest": "╪╖┘ä╪¿ ╪║┘è╪▒ ╪╡╪º┘ä╪¡",
     "employeeNotFound": "╪º┘ä┘à┘ê╪╕┘ü ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»",
     "employeeRecordNotFound": "╪│╪¼┘ä ╪º┘ä┘à┘ê╪╕┘ü ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»",
     "startDatePast": "┘ä╪º ┘è┘à┘â┘å ╪ú┘å ┘è┘â┘ê┘å ╪¬╪º╪▒┘è╪« ╪º┘ä╪¿╪»╪í ┘ü┘è ╪º┘ä┘à╪º╪╢┘è",
     "endDateBeforeStart": "┘è╪¼╪¿ ╪ú┘å ┘è┘â┘ê┘å ╪¬╪º╪▒┘è╪« ╪º┘ä╪º┘å╪¬┘ç╪º╪í ┘ü┘è ╪¬╪º╪▒┘è╪« ╪º┘ä╪¿╪»╪í ╪ú┘ê ╪¿╪╣╪»┘ç",
     "durationExceeds365": "┘ä╪º ┘è┘à┘â┘å ╪ú┘å ╪¬╪¬╪¼╪º┘ê╪▓ ╪º┘ä┘à╪»╪⌐ 365 ┘è┘ê┘à╪º┘ï",
+    "noWorkingDays": "┘ä╪º ╪¬╪¡╪¬┘ê┘è ╪º┘ä┘ü╪¬╪▒╪⌐ ╪º┘ä┘à╪¡╪»╪»╪⌐ ╪╣┘ä┘ë ╪ú┘è╪º┘à ╪╣┘à┘ä.",
+    "halfDayMustBeSingleDay": "┘è╪¼╪¿ ╪ú┘å ┘è┘â┘ê┘å ╪º┘ä╪Ñ╪¼╪º╪▓╪⌐ ┘å╪╡┘ü ╪º┘ä┘è┘ê┘à ╪»╪º╪«┘ä ┘è┘ê┘à ┘ê╪º╪¡╪».",
     "invalidLeaveType": "┘å┘ê╪╣ ╪º┘ä╪Ñ╪¼╪º╪▓╪⌐ ╪║┘è╪▒ ╪╡╪º┘ä╪¡",
     "sickRequiresAttachment": "╪º┘ä╪Ñ╪¼╪º╪▓╪⌐ ╪º┘ä┘à╪▒╪╢┘è╪⌐ ╪¬╪¬╪╖┘ä╪¿ ╪Ñ╪▒┘ü╪º┘é ╪¬┘é╪▒┘è╪▒ ╪╖╪¿┘è",
     "overlappingRequest": "┘ä╪»┘è┘â ╪¿╪º┘ä┘ü╪╣┘ä ╪╖┘ä╪¿ ┘é┘è╪» ╪º┘ä╪º┘å╪¬╪╕╪º╪▒ ╪ú┘ê ┘à╪╣╪¬┘à╪» ┘è╪¬╪»╪º╪«┘ä ┘à╪╣ ┘ç╪░┘ç ╪º┘ä╪¬┘ê╪º╪▒┘è╪«",
     "invalidAttachment": "┘à┘ä┘ü ┘à╪▒┘ü┘é ╪║┘è╪▒ ╪╡╪º┘ä╪¡ (╪¿╪¡╪» ╪ú┘é╪╡┘ë 5 ┘à┘è╪¼╪º╪¿╪º┘è╪¬╪î PDF/JPG/PNG ┘ü┘é╪╖)",
     "requestNotFoundOrProcessed": "╪º┘ä╪╖┘ä╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪» ╪ú┘ê ╪¬┘à╪¬ ┘à╪╣╪º┘ä╪¼╪¬┘ç ╪¿╪º┘ä┘ü╪╣┘ä",
     "insufficientBalance": "┘ä╪º ┘è┘à┘ä┘â ╪º┘ä┘à┘ê╪╕┘ü ╪▒╪╡┘è╪» ╪Ñ╪¼╪º╪▓╪⌐ ┘â╪º┘ü┘ì ┘ä┘ç╪░╪º ╪º┘ä╪╖┘ä╪¿",
     "rejectReasonRequired": "╪│╪¿╪¿ ╪º┘ä╪▒┘ü╪╢ ┘à╪╖┘ä┘ê╪¿",
     "requestNotFound": "╪º┘ä╪╖┘ä╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»",
     "requestAlreadyCancelled": "╪º┘ä╪╖┘ä╪¿ ┘à┘ä╪║┘ë ╪¿╪º┘ä┘ü╪╣┘ä",
     "cannotCancelProcessed": "┘ä╪º ┘è┘à┘â┘å ╪Ñ┘ä╪║╪º╪í ╪╖┘ä╪¿ ╪¬┘à╪¬ ┘à╪╣╪º┘ä╪¼╪¬┘ç",
diff --git a/src/i18n/messages/en.json b/src/i18n/messages/en.json
index c915ebb..a8be667 100644
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
@@ -72,20 +73,30 @@
     "phoneNumber": "Phone Number",
     "dateOfBirth": "Date of Birth",
     "nationality": "Nationality",
     "maritalStatus": "Marital Status",
     "employeeCode": "Employee Code",
     "jobTitle": "Job Title",
     "department": "Department",
     "hireDate": "Hire Date",
     "salary": "Salary (AED)",
     "role": "Role",
+    "workWeek": "Work Week",
+    "days": {
+      "sun": "Sun",
+      "mon": "Mon",
+      "tue": "Tue",
+      "wed": "Wed",
+      "thu": "Thu",
+      "fri": "Fri",
+      "sat": "Sat"
+    },
     "bankName": "Bank Name",
     "iban": "IBAN",
     "swift": "SWIFT/BIC",
     "emergencyContactName": "Contact Name",
     "emergencyContactPhone": "Contact Phone",
     "save": "Save Employee",
     "saving": "Saving...",
     "success": "Employee created successfully",
     "skip": "Skip",
     "optional": "Optional"
@@ -183,20 +194,30 @@
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
@@ -637,20 +658,22 @@
     "codeExists": "An employee with this code already exists.",
     "emailOrCodeExists": "An employee with this email or code already exists.",
     "validationFailed": "Validation failed",
     "invalidInput": "Invalid input",
     "invalidRequest": "Invalid request",
     "employeeNotFound": "Employee not found",
     "employeeRecordNotFound": "Employee record not found",
     "startDatePast": "Start date cannot be in the past",
     "endDateBeforeStart": "End date must be on or after start date",
     "durationExceeds365": "Duration cannot exceed 365 days",
+    "noWorkingDays": "The selected period contains no working days.",
+    "halfDayMustBeSingleDay": "Half-day leave must be within a single day.",
     "invalidLeaveType": "Invalid leave type",
     "sickRequiresAttachment": "Sick leave requires a medical report attachment",
     "overlappingRequest": "You already have a pending or approved request overlapping these dates",
     "invalidAttachment": "Invalid attachment file (max 5MB, PDF/JPG/PNG only)",
     "requestNotFoundOrProcessed": "Request not found or already processed",
     "insufficientBalance": "Employee does not have enough leave balance for this request",
     "rejectReasonRequired": "Rejection reason is required",
     "requestNotFound": "Request not found",
     "requestAlreadyCancelled": "Request already cancelled",
     "cannotCancelProcessed": "Cannot cancel a processed request",
diff --git a/src/lib/__tests__/leave.test.ts b/src/lib/__tests__/leave.test.ts
index 24a21f3..910eb7f 100644
--- a/src/lib/__tests__/leave.test.ts
+++ b/src/lib/__tests__/leave.test.ts
@@ -9,31 +9,32 @@ const { mockSession, mockRevalidatePath, mockRedirect, mockDb } = vi.hoisted(()
     leaveRequest: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
     leaveBalance: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
     leaveType: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
     employee: { findUnique: vi.fn() },
     user: { findMany: vi.fn() },
     notification: { createMany: vi.fn(), create: vi.fn() },
     payrollPeriod: { findUnique: vi.fn() },
     payslip: { findMany: vi.fn(), update: vi.fn() },
     attendanceRecord: { groupBy: vi.fn() },
     appSetting: { findUnique: vi.fn() },
+    holiday: { findMany: vi.fn().mockResolvedValue([]) },
   }
   return { mockSession: session, mockRevalidatePath: revalidate, mockRedirect: redirect, mockDb: db }
 })
 
 vi.mock('@/lib/auth', () => ({ auth: () => Promise.resolve(mockSession) }))
 vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args) }))
 vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args) }))
 vi.mock('@/lib/db', () => ({ db: mockDb }))
 vi.mock('@/lib/upload', () => ({ uploadLeaveAttachment: () => Promise.resolve('/uploads/leaves/x.pdf') }))
 
-import { approveLeave, cancelLeave } from '@/lib/actions/leave'
+import { approveLeave, cancelLeave, submitLeave } from '@/lib/actions/leave'
 
 function makeFormData(data: Record<string, string>): FormData {
   const fd = new FormData()
   for (const [k, v] of Object.entries(data)) fd.set(k, v)
   return fd
 }
 
 const pendingRequest = {
   id: 'req1',
   employeeId: 'emp1',
@@ -148,10 +149,45 @@ describe('cancelLeave', () => {
       expect(t.leaveBalance.update).toHaveBeenCalledWith({
         where: { id: 'bal1' },
         data: { used: { decrement: 3 } },
       })
     })
 
     await cancelLeave(makeFormData({ id: 'req1' }))
     expect(mockDb.$transaction).toHaveBeenCalled()
   })
 })
+
+describe('submitLeave working days', () => {
+  beforeEach(() => {
+    vi.clearAllMocks()
+    mockSession.user.role = 'EMPLOYEE'
+    mockSession.user.id = 'u1'
+  })
+
+  it('rejects half-day spanning multiple days', async () => {
+    mockDb.employee.findUnique.mockResolvedValueOnce({
+      id: 'emp1', userId: 'u1', hireDate: new Date('2020-01-01'), workWeek: [0, 1, 2, 3, 4],
+    })
+    const form = makeFormData({
+      leaveTypeId: 'lt1', startDate: '2026-09-01', endDate: '2026-09-05',
+      isHalfDay: 'true', reason: 'x',
+    })
+    const result = await submitLeave(form)
+    expect(result?.error).toBeDefined()
+  })
+
+  it('rejects when range has no working days', async () => {
+    mockDb.employee.findUnique.mockResolvedValueOnce({
+      id: 'emp1', userId: 'u1', hireDate: new Date('2020-01-01'), workWeek: [0, 1, 2, 3, 4],
+    })
+    mockDb.leaveType.findUnique.mockResolvedValue({ id: 'lt1', isActive: true, requiresAttachment: false })
+    mockDb.holiday.findMany.mockResolvedValue([])
+    // 2026-09-04 (Fri) .. 2026-09-05 (Sat) ΓÇö non-working for Sun-Thu pattern
+    const form = makeFormData({
+      leaveTypeId: 'lt1', startDate: '2026-09-04', endDate: '2026-09-05',
+      isHalfDay: 'false', halfDayPeriod: '', reason: 'x',
+    })
+    const result = await submitLeave(form)
+    expect(result?.error).toContain('no working days')
+  })
+})
diff --git a/src/lib/__tests__/working-days.test.ts b/src/lib/__tests__/working-days.test.ts
new file mode 100644
index 0000000..e56a3b2
--- /dev/null
+++ b/src/lib/__tests__/working-days.test.ts
@@ -0,0 +1,61 @@
+import { describe, it, expect } from 'vitest'
+import { toUaeDateKey, isWorkingDay, countWorkingDays } from '@/lib/working-days'
+
+const SUN_THU = [0, 1, 2, 3, 4]
+const MON_SAT = [1, 2, 3, 4, 5, 6]
+
+describe('toUaeDateKey', () => {
+  it('converts a UTC instant to the UAE (UTC+4) calendar day', () => {
+    // 2026-01-01T20:00:00Z is 2026-01-02 00:00 in UAE
+    expect(toUaeDateKey(new Date('2026-01-01T20:00:00Z'))).toBe('2026-01-02')
+    expect(toUaeDateKey(new Date('2026-01-01T19:59:59Z'))).toBe('2026-01-01')
+  })
+})
+
+describe('isWorkingDay', () => {
+  it('returns true for a weekday in the pattern', () => {
+    // 2026-01-04 is a Sunday
+    expect(isWorkingDay('2026-01-04', SUN_THU, new Set())).toBe(true)
+  })
+
+  it('returns false for a weekend day', () => {
+    // 2026-01-09 is a Friday, 2026-01-10 Saturday
+    expect(isWorkingDay('2026-01-09', SUN_THU, new Set())).toBe(false)
+    expect(isWorkingDay('2026-01-10', SUN_THU, new Set())).toBe(false)
+  })
+
+  it('respects custom patterns', () => {
+    expect(isWorkingDay('2026-01-09', MON_SAT, new Set())).toBe(true)
+    expect(isWorkingDay('2026-01-04', MON_SAT, new Set())).toBe(false)
+  })
+
+  it('returns false on a holiday even if it is a working weekday', () => {
+    expect(isWorkingDay('2026-01-04', SUN_THU, new Set(['2026-01-04']))).toBe(false)
+  })
+})
+
+describe('countWorkingDays', () => {
+  it('counts inclusive range skipping weekends', () => {
+    // Sun 2026-01-04 .. Sat 2026-01-10 ΓåÆ Sun,Mon,Tue,Wed,Thu = 5
+    expect(countWorkingDays('2026-01-04', '2026-01-10', SUN_THU, new Set())).toBe(5)
+  })
+
+  it('excludes holidays inside the range', () => {
+    const h = new Set(['2026-01-05']) // Monday
+    expect(countWorkingDays('2026-01-04', '2026-01-06', SUN_THU, h)).toBe(2)
+  })
+
+  it('returns 0 when the whole range is non-working', () => {
+    // Fri-Sat only
+    expect(countWorkingDays('2026-01-09', '2026-01-10', SUN_THU, new Set())).toBe(0)
+  })
+
+  it('handles year boundary', () => {
+    // Wed 2025-12-31 .. Fri 2026-01-02 ΓåÆ Wed(1) + Thu(1), Fri off = 2
+    expect(countWorkingDays('2025-12-31', '2026-01-02', SUN_THU, new Set())).toBe(2)
+  })
+
+  it('single working day returns 1', () => {
+    expect(countWorkingDays('2026-01-04', '2026-01-04', SUN_THU, new Set())).toBe(1)
+  })
+})
diff --git a/src/lib/actions/employee.ts b/src/lib/actions/employee.ts
index 3c3d527..2018ac9 100644
--- a/src/lib/actions/employee.ts
+++ b/src/lib/actions/employee.ts
@@ -1,28 +1,29 @@
 'use server'
 
 import { serverError } from '@/lib/errors'
 import { db } from '@/lib/db'
 import { employeeFormSchema } from '@/lib/validations/employee'
 import { auth } from '@/lib/auth'
 import bcrypt from 'bcryptjs'
 import { revalidatePath } from 'next/cache'
 import { redirect } from 'next/navigation'
 import type { Role } from '@prisma/client'
+import { z } from 'zod'
 
 export async function createEmployee(formData: FormData) {
   const session = await auth()
   if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
     return { error: await serverError('unauthorized') }
   }
 
-  const raw = Object.fromEntries(formData.entries())
+  const raw = { ...Object.fromEntries(formData.entries()), workWeek: formData.getAll('workWeek') }
 
   const parsed = employeeFormSchema.safeParse(raw)
   if (!parsed.success) {
     return {
       error: await serverError('validationFailed'),
       fieldErrors: parsed.error.flatten().fieldErrors,
     }
   }
 
   const data = parsed.data
@@ -56,25 +57,39 @@ export async function createEmployee(formData: FormData) {
             phoneNumber: data.phoneNumber || null,
             jobTitle: data.jobTitle,
             department: data.department,
             hireDate: new Date(data.hireDate),
             salary: parseFloat(data.salary),
             bankName: data.bankName || null,
             iban: data.iban || null,
             swift: data.swift || null,
             emergencyContactName: data.emergencyContactName || null,
             emergencyContactPhone: data.emergencyContactPhone || null,
+            workWeek: data.workWeek,
           },
         },
       },
     })
   } catch (e) {
     const isUniqueViolation = typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002'
     if (isUniqueViolation) {
       return { error: await serverError('emailOrCodeExists'), fieldErrors: {} }
     }
     throw e
   }
 
   revalidatePath('/employees')
   redirect('/employees')
 }
+
+export async function updateEmployeeWorkWeek(formData: FormData) {
+  const session = await auth()
+  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }
+
+  const employeeId = formData.get('employeeId') as string
+  const days = formData.getAll('workWeek').map(Number)
+  const parsed = z.array(z.number().int().min(0).max(6)).min(1).safeParse(days)
+  if (!parsed.success || !employeeId) return { error: await serverError('invalidInput') }
+
+  await db.employee.update({ where: { id: employeeId }, data: { workWeek: parsed.data } })
+  revalidatePath('/employees')
+}
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
diff --git a/src/lib/actions/leave.ts b/src/lib/actions/leave.ts
index 46109f9..1fa7d19 100644
--- a/src/lib/actions/leave.ts
+++ b/src/lib/actions/leave.ts
@@ -2,20 +2,21 @@
 
 import { db } from '@/lib/db'
 import { submitLeaveSchema, approveLeaveSchema, rejectLeaveSchema, cancelLeaveSchema, setAllocationSchema } from '@/lib/validations/leave'
 import { auth } from '@/lib/auth'
 import { uploadLeaveAttachment } from '@/lib/upload'
 import { getOrCreateLeaveBalance } from '@/lib/queries/leave'
 import { revalidatePath } from 'next/cache'
 import { redirect } from 'next/navigation'
 import { createNotifications, createNotification, getApproverUserIds } from './notifications'
 import { serverError } from '@/lib/errors'
+import { countWorkingDays, toUaeDateKey } from '@/lib/working-days'
 
 export async function submitLeave(formData: FormData) {
   const session = await auth()
   if (!session?.user?.id) return { error: await serverError('unauthorized') }
 
   const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
   if (!employee) return { error: await serverError('employeeRecordNotFound') }
 
   const raw = {
     leaveTypeId: formData.get('leaveTypeId') as string,
@@ -32,24 +33,30 @@ export async function submitLeave(formData: FormData) {
   const data = parsed.data
   const start = new Date(data.startDate)
   const end = new Date(data.endDate)
   const isHalfDay = data.isHalfDay === 'true'
 
   const today = new Date()
   today.setHours(0, 0, 0, 0)
   if (start < today) return { error: await serverError('startDatePast') }
   if (end < start) return { error: await serverError('endDateBeforeStart') }
 
-  const diffTime = end.getTime() - start.getTime()
-  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
-  const durationDays = isHalfDay ? 0.5 : diffDays
+  const holidays = await db.holiday.findMany({
+    where: { date: { gte: start, lte: end } },
+    select: { date: true },
+  })
+  const holidayKeys = new Set(holidays.map((h) => toUaeDateKey(h.date)))
+  const durationDays = isHalfDay
+    ? 0.5
+    : countWorkingDays(toUaeDateKey(start), toUaeDateKey(end), employee.workWeek, holidayKeys)
 
+  if (!isHalfDay && durationDays === 0) return { error: await serverError('noWorkingDays') }
   if (!isHalfDay && durationDays > 365) return { error: await serverError('durationExceeds365') }
 
   const leaveType = await db.leaveType.findUnique({ where: { id: data.leaveTypeId } })
   if (!leaveType || !leaveType.isActive) return { error: await serverError('invalidLeaveType') }
 
   if (leaveType.requiresAttachment) {
     const file = formData.get('attachment') as File
     if (!file || file.size === 0) return { error: await serverError('sickRequiresAttachment') }
   }
 
diff --git a/src/lib/errors.ts b/src/lib/errors.ts
index 3ef22d3..7aa89dd 100644
--- a/src/lib/errors.ts
+++ b/src/lib/errors.ts
@@ -6,20 +6,22 @@ export type ErrorKey =
   | 'codeExists'
   | 'emailOrCodeExists'
   | 'validationFailed'
   | 'invalidInput'
   | 'invalidRequest'
   | 'employeeNotFound'
   | 'employeeRecordNotFound'
   | 'startDatePast'
   | 'endDateBeforeStart'
   | 'durationExceeds365'
+  | 'noWorkingDays'
+  | 'halfDayMustBeSingleDay'
   | 'invalidLeaveType'
   | 'sickRequiresAttachment'
   | 'overlappingRequest'
   | 'invalidAttachment'
   | 'requestNotFoundOrProcessed'
   | 'insufficientBalance'
   | 'rejectReasonRequired'
   | 'requestNotFound'
   | 'requestAlreadyCancelled'
   | 'cannotCancelProcessed'
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
diff --git a/src/lib/validations/employee.ts b/src/lib/validations/employee.ts
index 41d4efa..e5f008b 100644
--- a/src/lib/validations/employee.ts
+++ b/src/lib/validations/employee.ts
@@ -13,20 +13,21 @@ export const employeeFormSchema = z.object({
   jobTitle: z.string().min(1, 'Required').max(100),
   department: z.string().min(1, 'Required'),
   hireDate: z.string().min(1, 'Required'),
   salary: z.string().min(1, 'Required').regex(/^\d+(\.\d{1,2})?$/, 'Invalid format'),
   role: z.enum(['HR_ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
   bankName: z.string().optional(),
   iban: z.string().optional(),
   swift: z.string().optional(),
   emergencyContactName: z.string().optional(),
   emergencyContactPhone: z.string().optional(),
+  workWeek: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Select at least one day').default([0, 1, 2, 3, 4]),
 })
 
 export type EmployeeFormData = z.infer<typeof employeeFormSchema>
 
 export const departments = ['HR', 'Finance', 'IT', 'Operations', 'Sales', 'Marketing', 'Legal', 'Executive'] as const
 
 export const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'] as const
 
 export const countries = [
   { code: 'AE', name: 'United Arab Emirates' },
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
diff --git a/src/lib/validations/leave.ts b/src/lib/validations/leave.ts
index 6f003df..fe94438 100644
--- a/src/lib/validations/leave.ts
+++ b/src/lib/validations/leave.ts
@@ -1,24 +1,29 @@
 import { z } from 'zod'
 
 export const leaveTypeSchema = z.enum([
   'Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Hajj/Umrah', 'Compassionate', 'Unpaid',
 ])
 
-export const submitLeaveSchema = z.object({
-  leaveTypeId: z.string().min(1, 'Leave type is required'),
-  startDate: z.string().min(1, 'Start date is required'),
-  endDate: z.string().min(1, 'End date is required'),
-  isHalfDay: z.string().optional(),
-  halfDayPeriod: z.string().optional(),
-  reason: z.string().min(1, 'Reason is required'),
-})
+export const submitLeaveSchema = z
+  .object({
+    leaveTypeId: z.string().min(1, 'Leave type is required'),
+    startDate: z.string().min(1, 'Start date is required'),
+    endDate: z.string().min(1, 'End date is required'),
+    isHalfDay: z.string().optional(),
+    halfDayPeriod: z.string().optional(),
+    reason: z.string().min(1, 'Reason is required'),
+  })
+  .refine(
+    (d) => d.isHalfDay !== 'true' || d.startDate === d.endDate,
+    { message: 'Half-day leave must start and end on the same day', path: ['endDate'] },
+  )
 
 export const approveLeaveSchema = z.object({
   id: z.string().min(1),
 })
 
 export const rejectLeaveSchema = z.object({
   id: z.string().min(1),
   rejectReason: z.string().min(1, 'Rejection reason is required'),
 })
 
diff --git a/src/lib/working-days.ts b/src/lib/working-days.ts
new file mode 100644
index 0000000..1b7a1e4
--- /dev/null
+++ b/src/lib/working-days.ts
@@ -0,0 +1,29 @@
+const UAE_OFFSET_MS = 4 * 60 * 60 * 1000
+
+export function toUaeDateKey(d: Date): string {
+  return new Date(d.getTime() + UAE_OFFSET_MS).toISOString().slice(0, 10)
+}
+
+function keyToUtcMidnight(key: string): number {
+  return Date.parse(`${key}T00:00:00Z`)
+}
+
+export function isWorkingDay(dateKey: string, workWeek: number[], holidays: Set<string>): boolean {
+  if (holidays.has(dateKey)) return false
+  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
+  return workWeek.includes(day)
+}
+
+export function countWorkingDays(
+  startKey: string,
+  endKey: string,
+  workWeek: number[],
+  holidays: Set<string>,
+): number {
+  let count = 0
+  const DAY_MS = 24 * 60 * 60 * 1000
+  for (let t = keyToUtcMidnight(startKey); t <= keyToUtcMidnight(endKey); t += DAY_MS) {
+    if (isWorkingDay(new Date(t).toISOString().slice(0, 10), workWeek, holidays)) count++
+  }
+  return count
+}
