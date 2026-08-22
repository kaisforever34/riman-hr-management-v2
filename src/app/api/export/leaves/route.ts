import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { toCsv, isoDay } from '@/lib/csv'
import { isApprover } from '@/lib/roles'
import type { LeaveStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isApprover(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const yearParam = req.nextUrl.searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear()
  if (!Number.isFinite(year)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 })

  const yearStart = new Date(Date.UTC(year, 0, 1))
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1))

  const statusParam = req.nextUrl.searchParams.get('status')
  const status = VALID_STATUSES.includes(statusParam as LeaveStatus) ? (statusParam as LeaveStatus) : undefined

  const requests = await db.leaveRequest.findMany({
    where: {
      startDate: { gte: yearStart, lt: yearEnd },
      ...(status ? { status } : {}),
    },
    include: { employee: true, leaveType: true },
    orderBy: [{ startDate: 'asc' }],
  })

  const csv = toCsv(
    ['Employee Code', 'Name', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Reason'],
    requests.map((r) => [
      r.employee.employeeCode,
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.leaveType.name,
      isoDay(r.startDate),
      isoDay(r.endDate),
      r.durationDays,
      r.status,
      r.reason,
    ]),
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leaves-${isoDay(yearStart)}_to_${isoDay(new Date(yearEnd.getTime() - 1))}.csv"`,
    },
  })
}
