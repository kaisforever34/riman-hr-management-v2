import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSurveys } from '@/lib/actions/survey'
import SurveysListClient from './surveys-list-client'
export const dynamic = 'force-dynamic'


export default async function ManagerSurveysPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) redirect(`/${locale}/auth/signin`)
  const surveys = await getSurveys()
  return <SurveysListClient surveys={JSON.parse(JSON.stringify(surveys))} locale={locale} />
}
