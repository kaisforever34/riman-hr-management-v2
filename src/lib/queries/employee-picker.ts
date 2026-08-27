import { db } from '@/lib/db'

export interface EmployeeOption {
  id: string
  firstName: string
  lastName: string
}

export async function getEmployeeOptions(): Promise<EmployeeOption[]> {
  return db.employee.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  })
}

export async function resolveSelectedEmployee(employeeParam?: string): Promise<{
  employee: EmployeeOption | null
  employees: EmployeeOption[]
}> {
  const employees = await getEmployeeOptions()
  let employee: EmployeeOption | null = employeeParam
    ? employees.find(e => e.id === employeeParam) ?? null
    : null
  if (!employee && employees.length > 0) employee = employees[0]
  return { employee, employees }
}
