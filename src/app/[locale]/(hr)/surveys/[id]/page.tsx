import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMySurveys } from '@/lib/actions/survey'
import EmployeeSurveyFillClient from './employee-survey-fill-client'
export const dynamic = 'force-dynamic'


export default async function EmployeeSurveyFillPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const assignments = await getMySurveys()
  const assignment = assignments.find((a) => a.id === id)
  if (!assignment) notFound()

  return <EmployeeSurveyFillClient assignment={JSON.parse(JSON.stringify(assignment))} locale={locale} />
}
