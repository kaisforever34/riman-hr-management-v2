import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAssets } from '@/lib/actions/asset'
import { resolveSelectedEmployee } from '@/lib/queries/employee-picker'
import AssetsListClient from './assets-list-client'
export const dynamic = 'force-dynamic'


export default async function ManagerAssetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ employee?: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const { employee: employeeParam } = await searchParams
  const { employee, employees } = await resolveSelectedEmployee(employeeParam)

  const assets = await getAssets()
  return (
    <AssetsListClient
      assets={JSON.parse(JSON.stringify(assets))}
      employees={employees}
      employeeId={employee?.id ?? ''}
      locale={locale}
    />
  )
}
