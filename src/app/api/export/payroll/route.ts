import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { toCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const periodId = req.nextUrl.searchParams.get('periodId')
  const period = periodId
    ? await db.payrollPeriod.findUnique({
        where: { id: periodId },
        include: { payslips: { include: { employee: true } } },
      })
    : null
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const periodStart = new Date(Date.UTC(period.year, period.month - 1, 1))
  const periodEnd = new Date(Date.UTC(period.year, period.month, 0))

  const csv = toCsv(
    [
      'Employee Code',
      'Name',
      'Basic Salary',
      'Transportation Deduction',
      'Absence Deduction',
      'Late Deduction',
      'Net Pay',
    ],
    period.payslips.map((p) => [
      p.employee.employeeCode,
      `${p.employee.firstName} ${p.employee.lastName}`,
      p.basicSalary.toString(),
      p.transportationDeduction.toString(),
      p.absenceDeduction.toString(),
      p.lateDeduction.toString(),
      p.netPay.toString(),
    ]),
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payroll-${isoDay(periodStart)}_to_${isoDay(periodEnd)}.csv"`,
    },
  })
}
