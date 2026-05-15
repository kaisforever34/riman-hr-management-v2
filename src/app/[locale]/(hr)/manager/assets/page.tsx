import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAssets } from '@/lib/actions/asset'
import AssetsListClient from './assets-list-client'
export const dynamic = 'force-dynamic'


export default async function ManagerAssetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const assets = await getAssets()
  return <AssetsListClient assets={JSON.parse(JSON.stringify(assets))} locale={locale} />
}
