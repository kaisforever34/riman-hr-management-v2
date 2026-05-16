import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getLeaveRequestById } from '@/lib/queries/leave'
import LeaveDetailClient from './leave-detail-client'

export const dynamic = 'force-dynamic'

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const request = await getLeaveRequestById(id)
  if (!request) redirect(`/${locale}/leave`)

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee && !['MANAGER', 'HR_ADMIN'].includes(session.user.role)) redirect(`/${locale}/dashboard`)
  if (employee && request.employeeId !== employee.id && session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN') redirect(`/${locale}/leave`)

  return (
    <LeaveDetailClient
      request={JSON.parse(JSON.stringify(request))}
      role={session.user.role}
      locale={locale}
    />
  )
}
