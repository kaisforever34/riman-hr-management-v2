22b020f feat: per-employee weekly work pattern on employee forms
 src/app/[locale]/(hr)/employees/new/page.tsx | 33 +++++++++++++++++++++++++++-
 src/i18n/messages/ar.json                    | 10 +++++++++
 src/i18n/messages/en.json                    | 10 +++++++++
 src/lib/actions/employee.ts                  | 17 +++++++++++++-
 src/lib/validations/employee.ts              |  1 +
 5 files changed, 69 insertions(+), 2 deletions(-)
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
diff --git a/src/i18n/messages/ar.json b/src/i18n/messages/ar.json
index aafda30..7afffbb 100644
--- a/src/i18n/messages/ar.json
+++ b/src/i18n/messages/ar.json
@@ -73,20 +73,30 @@
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
diff --git a/src/i18n/messages/en.json b/src/i18n/messages/en.json
index 573ef94..a8be667 100644
--- a/src/i18n/messages/en.json
+++ b/src/i18n/messages/en.json
@@ -73,20 +73,30 @@
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
