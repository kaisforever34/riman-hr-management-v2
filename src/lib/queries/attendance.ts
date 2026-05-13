import { db } from '@/lib/db'

export async function getEmployeeAttendanceForMonth(employeeId: string, year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 1))
  return db.attendanceRecord.findMany({
    where: { employeeId, date: { gte: start, lt: end } },
    orderBy: { date: 'asc' },
  })
}

export async function getTodayRecord(employeeId: string, today: Date) {
  return db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  })
}

export async function getTodayRecordsForAllEmployees(today: Date) {
  return db.attendanceRecord.findMany({
    where: { date: today },
    include: { employee: { select: { firstName: true, lastName: true, department: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getAttendanceForDateRange(start: Date, end: Date) {
  return db.attendanceRecord.findMany({
    where: { date: { gte: start, lt: end } },
    include: { employee: { select: { firstName: true, lastName: true, department: true } } },
    orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
  })
}

export async function getAllActiveEmployees() {
  return db.employee.findMany({
    where: { isActive: true },
    include: { user: { select: { email: true } } },
    orderBy: { firstName: 'asc' },
  })
}
