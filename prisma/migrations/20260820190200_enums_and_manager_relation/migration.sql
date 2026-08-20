-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OnboardingTaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SurveyAssignmentStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'DAMAGED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterColumn: LeaveRequest.status
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" TYPE "LeaveStatus" USING "status"::"LeaveStatus";
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterColumn: AttendanceRecord.status
ALTER TABLE "AttendanceRecord" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AttendanceRecord" ALTER COLUMN "status" TYPE "AttendanceStatus" USING "status"::"AttendanceStatus";
ALTER TABLE "AttendanceRecord" ALTER COLUMN "status" SET DEFAULT 'PRESENT';

-- AlterColumn: PayrollPeriod.status
ALTER TABLE "PayrollPeriod" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PayrollPeriod" ALTER COLUMN "status" TYPE "PayrollStatus" USING "status"::"PayrollStatus";
ALTER TABLE "PayrollPeriod" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterColumn: PerformanceReview.status
ALTER TABLE "PerformanceReview" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PerformanceReview" ALTER COLUMN "status" TYPE "ReviewStatus" USING "status"::"ReviewStatus";
ALTER TABLE "PerformanceReview" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterColumn: EmployeeOnboarding.status
ALTER TABLE "EmployeeOnboarding" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EmployeeOnboarding" ALTER COLUMN "status" TYPE "OnboardingStatus" USING "status"::"OnboardingStatus";
ALTER TABLE "EmployeeOnboarding" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- AlterColumn: EmployeeOnboardingTask.status
ALTER TABLE "EmployeeOnboardingTask" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EmployeeOnboardingTask" ALTER COLUMN "status" TYPE "OnboardingTaskStatus" USING "status"::"OnboardingTaskStatus";
ALTER TABLE "EmployeeOnboardingTask" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterColumn: SurveyAssignment.status
ALTER TABLE "SurveyAssignment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SurveyAssignment" ALTER COLUMN "status" TYPE "SurveyAssignmentStatus" USING "status"::"SurveyAssignmentStatus";
ALTER TABLE "SurveyAssignment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterColumn: Asset.status
ALTER TABLE "Asset" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Asset" ALTER COLUMN "status" TYPE "AssetStatus" USING "status"::"AssetStatus";
ALTER TABLE "Asset" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';

-- AlterColumn: Expense.status
ALTER TABLE "Expense" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Expense" ALTER COLUMN "status" TYPE "ExpenseStatus" USING "status"::"ExpenseStatus";
ALTER TABLE "Expense" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable: Employee.managerId
ALTER TABLE "Employee" ADD COLUMN "managerId" TEXT;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
