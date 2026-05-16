import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getLeaveRequestById } from '@/lib/queries/leave'
import ManagerLeaveActionClient from './manager-leave-action-client'
export const dynamic = 'force-dynamic'


export default async function ManagerLeaveDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) redirect(`/${locale}/auth/signin`)

  const request = await getLeaveRequestById(id)
  if (!request) redirect(`/${locale}/manager/leaves`)

  return (
    <ManagerLeaveActionClient
      request={JSON.parse(JSON.stringify(request))}
      locale={locale}
    />
  )
}
