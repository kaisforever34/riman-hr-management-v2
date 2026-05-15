'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function getAnalytics() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return null
  }

  const employees = await db.employee.findMany({ select: { id: true, department: true, isActive: true } })
  const totalEmployees = employees.length
  const activeEmployees = employees.filter((e) => e.isActive).length

  const deptMap = new Map<string, number>()
  for (const e of employees) {
    if (e.isActive) deptMap.set(e.department, (deptMap.get(e.department) || 0) + 1)
  }
  const departmentDistribution = Array.from(deptMap.entries()).map(([name, count]) => ({ name, count }))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today.getTime() + 86400000)

  const todayRecords = await db.attendanceRecord.findMany({
    where: { date: { gte: today, lt: todayEnd } },
    select: { status: true },
  })
  const todayPresent = todayRecords.filter((r) => r.status === 'PRESENT').length
  const todayLate = todayRecords.filter((r) => r.status === 'LATE').length
  const todayAbsent = todayRecords.filter((r) => r.status === 'ABSENT').length

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthRecords = await db.attendanceRecord.findMany({
    where: { date: { gte: monthStart, lt: todayEnd } },
    select: { status: true },
  })
  const monthPresent = monthRecords.filter((r) => r.status === 'PRESENT').length
  const monthLate = monthRecords.filter((r) => r.status === 'LATE').length
  const monthAbsent = monthRecords.filter((r) => r.status === 'ABSENT').length

  const leaveRequests = await db.leaveRequest.findMany({ select: { id: true, status: true, leaveTypeId: true, leaveType: { select: { name: true } } } })
  const pendingLeaves = leaveRequests.filter((r) => r.status === 'PENDING').length
  const approvedLeaves = leaveRequests.filter((r) => r.status === 'APPROVED').length
  const rejectedLeaves = leaveRequests.filter((r) => r.status === 'REJECTED').length

  const typeMap = new Map<string, number>()
  for (const r of leaveRequests) {
    if (r.status === 'APPROVED') typeMap.set(r.leaveType.name, (typeMap.get(r.leaveType.name) || 0) + 1)
  }
  const leaveByType = Array.from(typeMap.entries()).map(([name, count]) => ({ name, count }))

  const payrolls = await db.payslip.findMany({
    where: { payrollPeriod: { status: 'FINALIZED' } },
    select: { netPay: true, employee: { select: { department: true } } },
  })
  const payrollDeptMap = new Map<string, number>()
  for (const p of payrolls) {
    const dept = p.employee.department
    payrollDeptMap.set(dept, (payrollDeptMap.get(dept) || 0) + Number(p.netPay))
  }
  const payrollByDepartment = Array.from(payrollDeptMap.entries()).map(([name, total]) => ({ name, total }))

  const reviews = await db.reviewRating.findMany({
    include: { criteria: true },
  })
  const ratingDistribution: Record<string, number> = {}
  for (const r of reviews) {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1
  }

  return {
    totalEmployees,
    activeEmployees,
    departmentDistribution,
    attendance: { todayPresent, todayLate, todayAbsent, monthPresent, monthLate, monthAbsent },
    leaves: { pendingLeaves, approvedLeaves, rejectedLeaves, leaveByType },
    payrollByDepartment,
    ratingDistribution,
  }
}
