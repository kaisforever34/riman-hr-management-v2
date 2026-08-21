4be787a perf: add indexes for leave, attendance, notification queries
 .../20260821081025_add_performance_indexes/migration.sql   | 14 ++++++++++++++
 prisma/schema.prisma                                       |  8 ++++++++
 2 files changed, 22 insertions(+)
diff --git a/prisma/migrations/20260821081025_add_performance_indexes/migration.sql b/prisma/migrations/20260821081025_add_performance_indexes/migration.sql
new file mode 100644
index 0000000..5844ec5
--- /dev/null
+++ b/prisma/migrations/20260821081025_add_performance_indexes/migration.sql
@@ -0,0 +1,14 @@
+-- CreateIndex
+CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");
+
+-- CreateIndex
+CREATE INDEX "LeaveRequest_employeeId_status_idx" ON "LeaveRequest"("employeeId", "status");
+
+-- CreateIndex
+CREATE INDEX "LeaveRequest_status_startDate_endDate_idx" ON "LeaveRequest"("status", "startDate", "endDate");
+
+-- CreateIndex
+CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
+
+-- CreateIndex
+CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index 479a4a3..3256917 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -169,20 +169,23 @@ model LeaveRequest {
   reason         String
   rejectReason   String?
   attachmentFile String?
   approvedById   String?
   approvedAt     DateTime?
   createdAt      DateTime  @default(now())
   updatedAt      DateTime  @updatedAt
   employee       Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
   leaveType      LeaveType @relation(fields: [leaveTypeId], references: [id])
   approvedBy     User?     @relation("ApprovedLeaveRequests", fields: [approvedById], references: [id])
+
+  @@index([employeeId, status])
+  @@index([status, startDate, endDate])
 }
 
 model AttendanceRecord {
   id                String    @id @default(cuid())
   employeeId        String
   date              DateTime
   checkIn           DateTime?
   checkOut          DateTime?
   status            AttendanceStatus @default(PRESENT)
   lateMinutes       Int       @default(0)
@@ -192,20 +195,21 @@ model AttendanceRecord {
   checkInNote       String?
   checkOutNote      String?
   adjustedById      String?
   createdAt         DateTime  @default(now())
   updatedAt         DateTime  @updatedAt
 
   employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
   adjustedBy User?    @relation(fields: [adjustedById], references: [id])
 
   @@unique([employeeId, date])
+  @@index([date])
 }
 
 model EmployeeDocument {
   id           String   @id @default(cuid())
   employeeId   String
   category     String
   fileName     String
   filePath     String
   fileSize     Int
   fileType     String
@@ -265,20 +269,22 @@ model Payslip {
   absenceDeduction      Decimal  @default(0) @db.Decimal(10, 2)
   lateDeduction         Decimal  @default(0) @db.Decimal(10, 2)
   netPay                Decimal  @db.Decimal(10, 2)
   createdAt             DateTime @default(now())
   updatedAt             DateTime @updatedAt
 
   payrollPeriod PayrollPeriod @relation(fields: [payrollPeriodId], references: [id], onDelete: Cascade)
   employee      Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
 
   @@unique([payrollPeriodId, employeeId])
+
+  @@index([employeeId])
 }
 
 model ReviewCriteria {
   id       String  @id @default(cuid())
   name     String  @unique
   nameAr   String?
   isBase   Boolean @default(true)
   isActive Boolean @default(true)
 
   ratings ReviewRating[]
@@ -415,20 +421,22 @@ model Notification {
   id        String   @id @default(cuid())
   userId    String
   type      String   // "LEAVE_SUBMITTED" | "LEAVE_APPROVED" | "LEAVE_REJECTED" | "ONBOARDING_TASK" | "OFFBOARDING_TASK" | "GENERAL"
   title     String
   message   String?
   link      String?
   isRead    Boolean  @default(false)
   createdAt DateTime @default(now())
 
   user User @relation(fields: [userId], references: [id], onDelete: Cascade)
+
+  @@index([userId, isRead])
 }
 
 model Survey {
   id          String   @id @default(cuid())
   title       String
   description String?
   isAnonymous Boolean  @default(false)
   isActive    Boolean  @default(true)
   dueDate     DateTime?
   createdById String
