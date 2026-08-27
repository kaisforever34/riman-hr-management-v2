-- AlterTable: Change LeaveBalance.allocated and carriedOver from Int to Float
-- for proper half-day support and carryover precision.

-- SQLite does not support ALTER COLUMN directly, so we recreate the table.
-- This migration is safe because the column types are compatible
-- (Int values are a subset of Float values in SQLite).

-- Create new table with Float columns
CREATE TABLE "LeaveBalance_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "yearStart" DATETIME NOT NULL,
    "yearEnd" DATETIME NOT NULL,
    "allocated" REAL NOT NULL DEFAULT 0,
    "carriedOver" REAL NOT NULL DEFAULT 0,
    "used" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data
INSERT INTO "LeaveBalance_new" ("id", "employeeId", "leaveTypeId", "yearStart", "yearEnd", "allocated", "carriedOver", "used")
SELECT "id", "employeeId", "leaveTypeId", "yearStart", "yearEnd", "allocated", "carriedOver", "used"
FROM "LeaveBalance";

-- Drop old table
DROP TABLE "LeaveBalance";

-- Rename new table
ALTER TABLE "LeaveBalance_new" RENAME TO "LeaveBalance";

-- Recreate unique index
CREATE UNIQUE INDEX "LeaveBalance_employeeId_leaveTypeId_yearStart_key" ON "LeaveBalance"("employeeId", "leaveTypeId", "yearStart");
