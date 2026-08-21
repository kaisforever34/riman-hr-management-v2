import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { toCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

function fileDate(d = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : ''
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30))
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59))

  const fromParam = req.nextUrl.searchParams.get('from')
  const toParam = req.nextUrl.searchParams.get('to')
  if (fromParam && Number.isNaN(Date.parse(fromParam)))
    return NextResponse.json({ error: 'Invalid from date' }, { status: 400 })
  if (toParam && Number.isNaN(Date.parse(toParam)))
    return NextResponse.json({ error: 'Invalid to date' }, { status: 400 })
  const from = fromParam ? new Date(fromParam) : defaultFrom
  const to = toParam ? new Date(toParam) : defaultTo

  const records = await db.attendanceRecord.findMany({
    where: { date: { gte: from, lte: to } },
    include: { employee: true },
    orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
  })

  const csv = toCsv(
    ['Employee Code', 'Name', 'Date', 'Check In', 'Check Out', 'Status', 'Late Minutes', 'Early Leave Minutes'],
    records.map((r) => [
      r.employee.employeeCode,
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.date.toISOString().slice(0, 10),
      iso(r.checkIn),
      iso(r.checkOut),
      r.status,
      r.lateMinutes,
      r.earlyLeaveMinutes,
    ]),
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance-${fileDate()}.csv"`,
    },
  })
}
