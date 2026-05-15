import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOnboardingRecords } from '@/lib/actions/onboarding'
import OnboardingListClient from './onboarding-list-client'
export const dynamic = 'force-dynamic'


export default async function ManagerOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const records = await getOnboardingRecords('ONBOARDING')
  return <OnboardingListClient records={JSON.parse(JSON.stringify(records))} type="ONBOARDING" locale={locale} />
}
