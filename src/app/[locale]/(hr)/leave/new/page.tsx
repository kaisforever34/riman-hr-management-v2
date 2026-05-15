import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getLeaveTypes } from '@/lib/queries/leave'
import SubmitLeaveForm from './submit-leave-form'

export const dynamic = 'force-dynamic'

export default async function NewLeavePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)
  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) redirect(`/${locale}/dashboard`)

  const leaveTypes = await getLeaveTypes()
  return <SubmitLeaveForm leaveTypes={JSON.parse(JSON.stringify(leaveTypes))} locale={locale} />
}
