import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCompanySettings, getEmployeeFormLists } from '@/lib/queries/company'
import { AddEmployeeClient } from './add-employee-client'

export const dynamic = 'force-dynamic'

export default async function AddEmployeePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const [company, lists] = await Promise.all([getCompanySettings(), getEmployeeFormLists()])

  return (
    <AddEmployeeClient
      currency={company.currency}
      departmentOptions={lists.departments}
      nationalityOptions={lists.nationalities}
      defaultWorkWeek={lists.defaultWorkWeek}
    />
  )
}
