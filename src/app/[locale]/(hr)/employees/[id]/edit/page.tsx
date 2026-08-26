import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { EditEmployeeClient } from './edit-employee-client'

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params

  const session = await auth()
  if (!session?.user) return notFound()

  const employee = await db.employee.findUnique({
    where: { id },
    include: { user: true },
  })

  if (!employee) return notFound()

  const employees = await db.employee.findMany({
    where: { isActive: true, id: { not: id } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  })

  return (
    <EditEmployeeClient
      employee={{
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        phoneNumber: employee.phoneNumber ?? '',
        jobTitle: employee.jobTitle,
        department: employee.department,
        nationality: employee.nationality,
        dateOfBirth: employee.dateOfBirth.toISOString().split('T')[0],
        maritalStatus: employee.maritalStatus ?? '',
        emergencyContactName: employee.emergencyContactName ?? '',
        emergencyContactPhone: employee.emergencyContactPhone ?? '',
        managerId: employee.managerId ?? '',
        bankName: employee.bankName ?? '',
        iban: employee.iban ?? '',
        swift: employee.swift ?? '',
        salary: employee.salary.toString(),
      }}
      managers={employees}
      locale={locale}
    />
  )
}
