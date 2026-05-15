import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAnalytics } from '@/lib/actions/analytics'
import AnalyticsClient from './analytics-client'
export const dynamic = 'force-dynamic'


export default async function AnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const data = await getAnalytics()
  if (!data) redirect(`/${locale}/auth/signin`)

  return <AnalyticsClient data={data} locale={locale} />
}
