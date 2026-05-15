import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMyOnboarding } from '@/lib/actions/onboarding'
import EmployeeOnboardingClient from './employee-onboarding-client'
export const dynamic = 'force-dynamic'


export default async function EmployeeOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const record = await getMyOnboarding()
  return <EmployeeOnboardingClient record={record ? JSON.parse(JSON.stringify(record)) : null} locale={locale} />
}
