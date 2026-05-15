import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMySurveys } from '@/lib/actions/survey'
import EmployeeSurveysClient from './employee-surveys-client'
export const dynamic = 'force-dynamic'


export default async function EmployeeSurveysPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const assignments = await getMySurveys()
  return <EmployeeSurveysClient assignments={JSON.parse(JSON.stringify(assignments))} locale={locale} />
}
