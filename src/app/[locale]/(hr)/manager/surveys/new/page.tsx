import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveEmployees } from '@/lib/actions/onboarding'
import NewSurveyClient from './new-survey-client'
export const dynamic = 'force-dynamic'


export default async function NewSurveyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) redirect(`/${locale}/auth/signin`)
  const employees = await getActiveEmployees()
  return <NewSurveyClient employees={JSON.parse(JSON.stringify(employees))} locale={locale} />
}
