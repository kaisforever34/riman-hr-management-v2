import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getCompanySettings, getEmployeeFormLists } from '@/lib/queries/company'
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

  const [employees, company, lists] = await Promise.all([
    db.employee.findMany({
      where: { isActive: true, id: { not: id } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
    getCompanySettings(),
    getEmployeeFormLists(),
  ])

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
        gender: employee.gender ?? '',
        maritalStatus: employee.maritalStatus ?? '',
        emergencyContactName: employee.emergencyContactName ?? '',
        emergencyContactPhone: employee.emergencyContactPhone ?? '',
        managerId: employee.managerId ?? '',
        bankName: employee.bankName ?? '',
        iban: employee.iban ?? '',
        swift: employee.swift ?? '',
        salary: employee.salary.toString(),
        basicSalary: employee.basicSalary?.toString() ?? '',
        housingAllowance: employee.housingAllowance?.toString() ?? '',
        transportAllowance: employee.transportAllowance?.toString() ?? '',
        otherAllowances: employee.otherAllowances?.toString() ?? '',
        contractType: employee.contractType ?? '',
        contractStartDate: employee.contractStartDate ? employee.contractStartDate.toISOString().split('T')[0] : '',
        contractEndDate: employee.contractEndDate ? employee.contractEndDate.toISOString().split('T')[0] : '',
        probationEndDate: employee.probationEndDate ? employee.probationEndDate.toISOString().split('T')[0] : '',
        visaExpiryDate: employee.visaExpiryDate ? employee.visaExpiryDate.toISOString().split('T')[0] : '',
        iqamaNumber: employee.iqamaNumber ?? '',
        iqamaExpiryDate: employee.iqamaExpiryDate ? employee.iqamaExpiryDate.toISOString().split('T')[0] : '',
      }}
      managers={employees}
      locale={locale}
      currency={company.currency}
      departmentOptions={lists.departments}
      nationalityOptions={lists.nationalities}
    />
  )
}
