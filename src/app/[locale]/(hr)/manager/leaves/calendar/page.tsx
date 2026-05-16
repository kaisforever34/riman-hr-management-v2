import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import CalendarClient from './calendar-client'
export const dynamic = 'force-dynamic'


export default async function LeaveCalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) redirect(`/${locale}/auth/signin`)

  const requests = await db.leaveRequest.findMany({
    where: { status: 'APPROVED' },
    include: {
      leaveType: true,
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  return <CalendarClient requests={JSON.parse(JSON.stringify(requests))} locale={locale} />
}
