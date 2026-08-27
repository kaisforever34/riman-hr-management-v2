import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOnboardingRecords } from '@/lib/actions/onboarding'
import { resolveSelectedEmployee } from '@/lib/queries/employee-picker'
import OnboardingListClient from '../onboarding/onboarding-list-client'
export const dynamic = 'force-dynamic'


export default async function ManagerOffboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ employee?: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const { employee: employeeParam } = await searchParams
  const { employee, employees } = await resolveSelectedEmployee(employeeParam)

  const records = await getOnboardingRecords('OFFBOARDING')
  return (
    <OnboardingListClient
      records={JSON.parse(JSON.stringify(records))}
      type="OFFBOARDING"
      locale={locale}
      employees={employees}
      employeeId={employee?.id ?? ''}
    />
  )
}
