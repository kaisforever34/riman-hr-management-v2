import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getNotifications } from '@/lib/actions/notifications'
import NotificationsClient from './notifications-client'
export const dynamic = 'force-dynamic'


export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const data = await getNotifications()
  return <NotificationsClient initial={JSON.parse(JSON.stringify(data))} locale={locale} />
}
