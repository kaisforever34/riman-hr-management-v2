import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAuditLogs } from '@/lib/queries/audit'
import AuditLogClient from './audit-log-client'
export const dynamic = 'force-dynamic'

export default async function AuditLogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN'))
    redirect(`/${locale}/auth/signin`)
  if (session.user.role !== 'HR_ADMIN') redirect(`/${locale}/dashboard`)

  const logs = await getAuditLogs()
  return <AuditLogClient logs={JSON.parse(JSON.stringify(logs))} />
}
