import { auth } from '@/lib/auth'
import { getBaseCriteria } from '@/lib/queries/performance'
import { getAllActiveEmployees } from '@/lib/queries/attendance'
import { NewReviewClient } from './new-review-client'

export const dynamic = 'force-dynamic'

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const { employee: employeeParam } = await searchParams

  const [criteria, employees] = await Promise.all([
    getBaseCriteria(),
    getAllActiveEmployees(),
  ])

  return (
    <NewReviewClient
      defaultEmployeeId={employeeParam ?? ''}
      criteria={criteria.map(c => ({ id: c.id, name: c.name, nameAr: c.nameAr }))}
      employees={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
    />
  )
}
