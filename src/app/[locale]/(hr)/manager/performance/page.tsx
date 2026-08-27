import { auth } from '@/lib/auth'
import { getReviews } from '@/lib/queries/performance'
import { resolveSelectedEmployee } from '@/lib/queries/employee-picker'
import { PerformanceClient } from './performance-client'

export const dynamic = 'force-dynamic'

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const { employee: employeeParam } = await searchParams
  const { employee, employees } = await resolveSelectedEmployee(employeeParam)

  const reviews = await getReviews()

  return (
    <PerformanceClient
      employeeId={employee?.id ?? ''}
      reviews={reviews.map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        department: r.employee.department,
        year: r.year,
        quarter: r.quarter,
        overallRating: r.overallRating,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))}
      employees={employees}
    />
  )
}
