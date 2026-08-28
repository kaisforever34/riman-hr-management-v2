import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAssetDetail } from '@/lib/actions/asset'
import { db } from '@/lib/db'
import { getCompanySettings } from '@/lib/queries/company'
import AssetDetailClient from './asset-detail-client'
export const dynamic = 'force-dynamic'


export default async function AssetDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const asset = await getAssetDetail(id)
  if (!asset) notFound()

  const [employees, company] = await Promise.all([
    db.employee.findMany({ where: { isActive: true }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } }),
    getCompanySettings(),
  ])
  return <AssetDetailClient asset={JSON.parse(JSON.stringify(asset))} employees={JSON.parse(JSON.stringify(employees))} locale={locale} currency={company.currency} />
}
