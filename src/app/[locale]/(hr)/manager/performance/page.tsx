import { auth } from '@/lib/auth'
import { getReviews } from '@/lib/queries/performance'
import { getAllActiveEmployees } from '@/lib/queries/attendance'
import { PerformanceClient } from './performance-client'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const [reviews, employees] = await Promise.all([
    getReviews(),
    getAllActiveEmployees(),
  ])

  return (
    <PerformanceClient
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
      employees={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
    />
  )
}
