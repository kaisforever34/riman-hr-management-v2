import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCompanySettings } from '@/lib/queries/company'
import TerminationsClient from './terminations-client'
export const dynamic = 'force-dynamic'

export default async function TerminationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN'))
    redirect(`/${locale}/auth/signin`)
  if (session.user.role !== 'HR_ADMIN') redirect(`/${locale}/dashboard`)

  const [records, company] = await Promise.all([
    db.eosbRecord.findMany({
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            jobTitle: true,
            terminationDate: true,
            hireDate: true,
          },
        },
      },
      orderBy: { terminationDate: 'desc' },
    }),
    getCompanySettings(),
  ])

  return (
    <TerminationsClient
      records={records.map(r => ({
        id: r.id,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeCode: r.employee.employeeCode,
        department: r.employee.department,
        jobTitle: r.employee.jobTitle,
        terminationDate: r.terminationDate.toISOString(),
        yearsOfService: r.yearsOfService,
        lastSalary: r.lastSalary,
        eosbAmount: r.eosbAmount,
      }))}
      currency={company.currency}
    />
  )
}
