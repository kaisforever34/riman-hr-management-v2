import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EmployeesPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const t = await getTranslations('employees')
  const te = await getTranslations('empty')
  const { q, page: pageStr } = await props.searchParams
  const page = parseInt(pageStr || '1', 10)
  const perPage = 20

  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' as const } },
          { lastName: { contains: q, mode: 'insensitive' as const } },
          { employeeCode: { contains: q, mode: 'insensitive' as const } },
          { department: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [employees, totalCount] = await Promise.all([
    db.employee.findMany({
      where,
      include: { user: { select: { email: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.employee.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <Link
          href="employees/new"
          className={buttonVariants()}
        >
          <Plus className="me-2 h-4 w-4" />
          {t('addEmployee')}
        </Link>
      </div>

      {totalCount > 0 && (
        <form className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input name="q" placeholder={t('search')} defaultValue={q} className="ps-9" />
        </form>
      )}

      {employees.length === 0 && !q ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="text-lg font-medium">{te('noEmployees.title')}</h3>
            <p className="text-sm text-zinc-500">{te('noEmployees.description')}</p>
            <Link
              href="employees/new"
              className={buttonVariants({ className: "mt-4" })}
            >
              <Plus className="me-2 h-4 w-4" />
              {te('noEmployees.cta')}
            </Link>
          </CardContent>
        </Card>
      ) : employees.length === 0 && q ? (
        <div className="py-12 text-center">
          <p className="text-zinc-500">No employees match your search.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('employeeCode')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('department')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('jobTitle')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">
                    {emp.firstName} {emp.lastName}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-zinc-500">
                    {emp.employeeCode}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{emp.department}</TableCell>
                  <TableCell className="hidden md:table-cell">{emp.jobTitle}</TableCell>
                  <TableCell>
                    <Badge variant={emp.user.isActive ? 'default' : 'secondary'}>
                      {emp.user.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${q ? `&q=${q}` : ''}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >Previous</Link>
          )}
          <span className="text-sm text-zinc-500">
            {t('page')} {page} {t('of')} {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}${q ? `&q=${q}` : ''}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >Next</Link>
          )}
        </div>
      )}
    </div>
  )
}
