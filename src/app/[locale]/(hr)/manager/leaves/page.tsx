import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getManagerAllRequests, getAllLeaveTypes, getEmployees } from '@/lib/queries/leave'
import ManagerLeavesClient from './manager-leaves-client'

export default async function ManagerLeavesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ employeeId?: string; status?: string; leaveTypeId?: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') redirect(`/${locale}/auth/signin`)

  const filters = await searchParams
  const [requests, leaveTypes, employees] = await Promise.all([
    getManagerAllRequests(filters),
    getAllLeaveTypes(),
    getEmployees(),
  ])

  return (
    <ManagerLeavesClient
      requests={JSON.parse(JSON.stringify(requests))}
      leaveTypes={JSON.parse(JSON.stringify(leaveTypes))}
      employees={JSON.parse(JSON.stringify(employees))}
      locale={locale}
      currentFilters={filters}
    />
  )
}
