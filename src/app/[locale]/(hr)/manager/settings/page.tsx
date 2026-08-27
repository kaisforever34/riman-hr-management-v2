import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllSettings } from '@/lib/actions/settings'
import SettingsClient from './settings-client'
export const dynamic = 'force-dynamic'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN'))
    redirect(`/${locale}/auth/signin`)
  if (session.user.role !== 'HR_ADMIN') redirect(`/${locale}/dashboard`)

  const result = await getAllSettings()
  const settings = 'data' in result && result.data ? result.data : {}

  return <SettingsClient settings={settings} />
}
