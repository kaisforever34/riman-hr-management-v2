import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSurveyResults } from '@/lib/actions/survey'
import SurveyResultsClient from './survey-results-client'
export const dynamic = 'force-dynamic'


export default async function SurveyResultsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) redirect(`/${locale}/auth/signin`)
  const survey = await getSurveyResults(id)
  if (!survey) redirect(`/${locale}/manager/surveys`)
  return <SurveyResultsClient survey={JSON.parse(JSON.stringify(survey))} locale={locale} />
}
