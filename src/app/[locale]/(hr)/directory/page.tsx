import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { DirectoryClient } from './directory-client'

export const dynamic = 'force-dynamic'

export default async function DirectoryPage() {
  const session = await auth()
  if (!session?.user) return null

  const employees = await db.employee.findMany({
    include: {
      user: { select: { email: true, isActive: true, role: true } },
    },
    orderBy: [{ department: 'asc' }, { firstName: 'asc' }],
  })

  const isManager = (role: string) => role === 'HR_ADMIN' || role === 'MANAGER'

  const managers = employees.filter((e) => isManager(e.user.role) && e.user.isActive)
  const staff = employees.filter((e) => !isManager(e.user.role) && e.user.isActive)

  const map = (e: typeof employees[0]) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    jobTitle: e.jobTitle,
    department: e.department,
    employeeCode: e.employeeCode,
    email: e.user.email,
    phone: e.phoneNumber ?? null,
    emergencyContact: e.emergencyContactName ?? null,
    emergencyPhone: e.emergencyContactPhone ?? null,
    joinDate: e.hireDate.toISOString(),
    isManager: isManager(e.user.role),
  })

  return <DirectoryClient managers={managers.map(map)} staff={staff.map(map)} />
}
