import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getEmployeeLeaveRequests, getEmployeeLeaveBalances } from '@/lib/queries/leave'
import LeaveClient from './leave-client'

export default async function LeavePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) redirect(`/${locale}/dashboard`)

  const [requests, balances] = await Promise.all([
    getEmployeeLeaveRequests(employee.id),
    getEmployeeLeaveBalances(employee.id),
  ])

  return (
    <LeaveClient
      requests={JSON.parse(JSON.stringify(requests))}
      balances={JSON.parse(JSON.stringify(balances))}
      locale={locale}
    />
  )
}
