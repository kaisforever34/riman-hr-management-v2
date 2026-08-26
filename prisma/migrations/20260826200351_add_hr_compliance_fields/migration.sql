-- AlterTable
ALTER TABLE "EmployeeOnboardingTask" ADD COLUMN "deadline" DATETIME;

-- CreateTable
CREATE TABLE "OvertimeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OvertimeRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OvertimeRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EosbRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "terminationDate" DATETIME NOT NULL,
    "yearsOfService" REAL NOT NULL,
    "lastSalary" REAL NOT NULL,
    "eosbAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EosbRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AttendanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "checkIn" DATETIME,
    "checkOut" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeApproved" BOOLEAN NOT NULL DEFAULT false,
    "graceMinutes" INTEGER NOT NULL DEFAULT 0,
    "autoClockout" BOOLEAN NOT NULL DEFAULT false,
    "checkInMethod" TEXT NOT NULL DEFAULT 'CLICK',
    "checkOutMethod" TEXT,
    "checkInNote" TEXT,
    "checkOutNote" TEXT,
    "adjustedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttendanceRecord_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AttendanceRecord" ("adjustedById", "checkIn", "checkInMethod", "checkInNote", "checkOut", "checkOutMethod", "checkOutNote", "createdAt", "date", "earlyLeaveMinutes", "employeeId", "id", "lateMinutes", "status", "updatedAt") SELECT "adjustedById", "checkIn", "checkInMethod", "checkInNote", "checkOut", "checkOutMethod", "checkOutNote", "createdAt", "date", "earlyLeaveMinutes", "employeeId", "id", "lateMinutes", "status", "updatedAt" FROM "AttendanceRecord";
DROP TABLE "AttendanceRecord";
ALTER TABLE "new_AttendanceRecord" RENAME TO "AttendanceRecord";
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_date_key" ON "AttendanceRecord"("employeeId", "date");
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "gender" TEXT,
    "nationality" TEXT NOT NULL,
    "maritalStatus" TEXT,
    "phoneNumber" TEXT,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "hireDate" DATETIME NOT NULL,
    "salary" REAL NOT NULL,
    "basicSalary" REAL NOT NULL DEFAULT 0,
    "housingAllowance" REAL NOT NULL DEFAULT 0,
    "transportAllowance" REAL NOT NULL DEFAULT 0,
    "otherAllowances" REAL NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workWeek" TEXT NOT NULL DEFAULT '[0,1,2,3,4]',
    "contractType" TEXT,
    "contractStartDate" DATETIME,
    "contractEndDate" DATETIME,
    "probationEndDate" DATETIME,
    "terminationDate" DATETIME,
    "visaExpiryDate" DATETIME,
    "iqamaNumber" TEXT,
    "iqamaExpiryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("bankName", "createdAt", "dateOfBirth", "department", "emergencyContactName", "emergencyContactPhone", "employeeCode", "firstName", "hireDate", "iban", "id", "isActive", "jobTitle", "lastName", "managerId", "maritalStatus", "nationality", "phoneNumber", "salary", "swift", "updatedAt", "userId", "workWeek") SELECT "bankName", "createdAt", "dateOfBirth", "department", "emergencyContactName", "emergencyContactPhone", "employeeCode", "firstName", "hireDate", "iban", "id", "isActive", "jobTitle", "lastName", "managerId", "maritalStatus", "nationality", "phoneNumber", "salary", "swift", "updatedAt", "userId", "workWeek" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE TABLE "new_Payslip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollPeriodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" REAL NOT NULL,
    "housingAllowance" REAL NOT NULL DEFAULT 0,
    "transportAllowance" REAL NOT NULL DEFAULT 0,
    "otherAllowances" REAL NOT NULL DEFAULT 0,
    "totalGross" REAL NOT NULL DEFAULT 0,
    "transportationDeduction" REAL NOT NULL DEFAULT 0,
    "absenceDeduction" REAL NOT NULL DEFAULT 0,
    "lateDeduction" REAL NOT NULL DEFAULT 0,
    "gpssaEmployee" REAL NOT NULL DEFAULT 0,
    "gpssaEmployer" REAL NOT NULL DEFAULT 0,
    "overtimePay" REAL NOT NULL DEFAULT 0,
    "bonusPay" REAL NOT NULL DEFAULT 0,
    "totalDeductions" REAL NOT NULL DEFAULT 0,
    "eosbAmount" REAL NOT NULL DEFAULT 0,
    "netPay" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payslip_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payslip" ("absenceDeduction", "basicSalary", "createdAt", "employeeId", "id", "lateDeduction", "netPay", "payrollPeriodId", "transportationDeduction", "updatedAt") SELECT "absenceDeduction", "basicSalary", "createdAt", "employeeId", "id", "lateDeduction", "netPay", "payrollPeriodId", "transportationDeduction", "updatedAt" FROM "Payslip";
DROP TABLE "Payslip";
ALTER TABLE "new_Payslip" RENAME TO "Payslip";
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");
CREATE UNIQUE INDEX "Payslip_payrollPeriodId_employeeId_key" ON "Payslip"("payrollPeriodId", "employeeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OvertimeRecord_employeeId_idx" ON "OvertimeRecord"("employeeId");

-- CreateIndex
CREATE INDEX "OvertimeRecord_date_idx" ON "OvertimeRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeRecord_employeeId_date_key" ON "OvertimeRecord"("employeeId", "date");
