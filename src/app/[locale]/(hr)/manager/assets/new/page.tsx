import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import NewAssetClient from './new-asset-client'
export const dynamic = 'force-dynamic'


export default async function NewAssetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const employees = await db.employee.findMany({ where: { isActive: true }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } })
  return <NewAssetClient employees={JSON.parse(JSON.stringify(employees))} locale={locale} />
}
