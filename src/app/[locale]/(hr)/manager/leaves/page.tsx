import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getManagerAllRequests, getAllLeaveTypes, getEmployees } from '@/lib/queries/leave'
import ManagerLeavesClient from './manager-leaves-client'
import type { LeaveStatus } from '@/lib/types'
export const dynamic = 'force-dynamic'

const LEAVE_STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

export default async function ManagerLeavesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ employeeId?: string; status?: string; leaveTypeId?: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) redirect(`/${locale}/auth/signin`)

  const raw = await searchParams
  const filters = {
    employeeId: raw.employeeId,
    leaveTypeId: raw.leaveTypeId,
    status: LEAVE_STATUSES.includes(raw.status as LeaveStatus) ? (raw.status as LeaveStatus) : undefined,
  }
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
