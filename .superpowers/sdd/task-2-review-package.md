d5368a3 feat: add Employee.workWeek and Holiday table
 .../20260821091256_workweek_and_holidays/migration.sql  | 17 +++++++++++++++++
 prisma/schema.prisma                                    | 10 ++++++++++
 2 files changed, 27 insertions(+)
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
