import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getHolidays } from '@/lib/queries/holiday'
import { isApprover } from '@/lib/roles'
import CalendarClient from './calendar-client'
export const dynamic = 'force-dynamic'


export default async function LeaveCalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) redirect(`/${locale}/auth/signin`)

  const requests = await db.leaveRequest.findMany({
    where: { status: 'APPROVED' },
    include: {
      leaveType: true,
      employee: { select: { firstName: true, lastName: true, workWeek: true } },
    },
    orderBy: { startDate: 'asc' },
  })
  const holidays = await getHolidays()

  return (
    <CalendarClient
      requests={JSON.parse(JSON.stringify(requests))}
      holidays={JSON.parse(JSON.stringify(holidays))}
    />
  )
}
