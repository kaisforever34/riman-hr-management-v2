-- AlterColumn: leave balance used must support half-day (0.5) values
ALTER TABLE "LeaveBalance" ALTER COLUMN "used" SET DATA TYPE DOUBLE PRECISION;
