import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { DocumentsClient } from './documents-client'
import { resolveSelectedEmployee } from '@/lib/queries/employee-picker'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const { employee: employeeParam } = await searchParams
  const { employee, employees } = await resolveSelectedEmployee(employeeParam)

  const [employeeDocs, companyDocs] = await Promise.all([
    db.employeeDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }),
    db.companyDocument.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  return (
    <DocumentsClient
      employeeId={employee?.id ?? ''}
      employeeDocs={employeeDocs.map(d => ({
        id: d.id,
        employeeId: d.employeeId,
        employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
        category: d.category,
        fileName: d.fileName,
        fileSize: d.fileSize,
        fileType: d.fileType,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      }))}
      companyDocs={companyDocs.map(d => ({
        id: d.id,
        category: d.category,
        title: d.title,
        fileName: d.fileName,
        fileSize: d.fileSize,
        fileType: d.fileType,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      }))}
      employees={employees}
    />
  )
}
