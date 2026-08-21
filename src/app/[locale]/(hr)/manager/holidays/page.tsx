import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getHolidays } from '@/lib/queries/holiday'
import HolidaysClient from './holidays-client'
export const dynamic = 'force-dynamic'

export default async function HolidaysPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN'))
    redirect(`/${locale}/auth/signin`)
  if (session.user.role !== 'HR_ADMIN') redirect(`/${locale}/dashboard`)

  const holidays = await getHolidays()
  return <HolidaysClient holidays={JSON.parse(JSON.stringify(holidays))} />
}
