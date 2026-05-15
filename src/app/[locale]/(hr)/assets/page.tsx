import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMyAssets } from '@/lib/actions/asset'
import EmployeeAssetsClient from './employee-assets-client'
export const dynamic = 'force-dynamic'


export default async function EmployeeAssetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const assignments = await getMyAssets()
  return <EmployeeAssetsClient assignments={JSON.parse(JSON.stringify(assignments))} locale={locale} />
}
