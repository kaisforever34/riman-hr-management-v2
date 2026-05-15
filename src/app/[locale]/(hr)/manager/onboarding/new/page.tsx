import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveEmployees } from '@/lib/actions/onboarding'
import NewOnboardingClient from './new-onboarding-client'
export const dynamic = 'force-dynamic'


export default async function NewOnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const employees = await getActiveEmployees()
  return <NewOnboardingClient employees={JSON.parse(JSON.stringify(employees))} locale={locale} />
}
