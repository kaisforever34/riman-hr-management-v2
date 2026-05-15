import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import OnboardingDetailClient from './onboarding-detail-client'
export const dynamic = 'force-dynamic'


export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const record = await db.employeeOnboarding.findUnique({
    where: { id },
    include: {
      employee: true,
      tasks: {
        include: { taskTemplate: true },
        orderBy: { taskTemplate: { order: 'asc' } },
      },
    },
  })

  if (!record) redirect(`/${locale}/manager/onboarding`)

  return <OnboardingDetailClient record={JSON.parse(JSON.stringify(record))} locale={locale} />
}
