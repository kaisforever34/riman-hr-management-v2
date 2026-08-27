import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveEmployees } from '@/lib/actions/onboarding'
import NewOffboardingClient from './new-offboarding-client'
export const dynamic = 'force-dynamic'


export default async function NewOffboardingPage({
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
  const employees = await getActiveEmployees()
  return <NewOffboardingClient employees={JSON.parse(JSON.stringify(employees))} locale={locale} defaultEmployeeId={employeeParam ?? ''} />
}
