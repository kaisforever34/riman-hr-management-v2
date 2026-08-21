143add8 feat: compute leave duration in working days
 src/i18n/messages/ar.json       |  2 ++
 src/i18n/messages/en.json       |  2 ++
 src/lib/__tests__/leave.test.ts | 38 +++++++++++++++++++++++++++++++++++++-
 src/lib/actions/leave.ts        | 13 ++++++++++---
 src/lib/errors.ts               |  2 ++
 src/lib/validations/leave.ts    | 21 +++++++++++++--------
 6 files changed, 66 insertions(+), 12 deletions(-)
diff --git a/src/i18n/messages/ar.json b/src/i18n/messages/ar.json
index 4fb79ba..e7fc66b 100644
--- a/src/i18n/messages/ar.json
+++ b/src/i18n/messages/ar.json
@@ -637,20 +637,22 @@
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
index c915ebb..a5592c3 100644
--- a/src/i18n/messages/en.json
+++ b/src/i18n/messages/en.json
@@ -637,20 +637,22 @@
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
 
