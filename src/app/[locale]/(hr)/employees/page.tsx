import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { DeactivateButton } from './deactivate-button'
import { ResetPasswordButton } from './reset-password-button'
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
import { Avatar } from '@/components/shared'
import { Plus, Search, Users, UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

function EmployeesSkeleton() {
  return (
    <div className="fi space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-40 rounded-lg bg-[rgba(255,255,255,0.05)]" />
        <div className="h-10 w-36 rounded-lg bg-[rgba(255,255,255,0.05)]" />
      </div>
      <div className="h-11 rounded-lg bg-[rgba(255,255,255,0.03)]" />
      <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 px-4 flex items-center gap-4 border-b border-[rgba(255,255,255,0.04)] last:border-0">
            <div className="h-4 w-40 rounded bg-[rgba(255,255,255,0.05)]" />
            <div className="h-4 w-20 rounded bg-[rgba(255,255,255,0.03)]" />
            <div className="h-4 w-24 rounded bg-[rgba(255,255,255,0.03)]" />
            <div className="h-4 w-28 rounded bg-[rgba(255,255,255,0.03)]" />
            <div className="h-6 w-16 rounded-full bg-[rgba(255,255,255,0.05)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

async function EmployeesData(props: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const t = await getTranslations('employees')
  const te = await getTranslations('empty')
  const session = await auth()
  const isHrAdmin = session?.user.role === 'HR_ADMIN'
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
      include: { user: { select: { email: true, isActive: true, id: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.employee.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <div className="fi space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-[#E0E6F4] tracking-tight">{t('title')}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="employees/new-user"
            className={buttonVariants({ variant: 'outline' })}
          >
            <UserPlus className="me-2 h-4 w-4" />
            {t('resetPassword')}
          </Link>
          <Link
            href="employees/new"
            className={buttonVariants()}
          >
            <Plus className="me-2 h-4 w-4" />
            {t('addEmployee')}
          </Link>
        </div>
      </div>

      {totalCount > 0 && (
        <form className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5168]" />
          <Input name="q" placeholder={t('search')} defaultValue={q} className="ps-9" />
        </form>
      )}

      {employees.length === 0 && !q ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.065)] flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-[#4A5168]" />
            </div>
            <h3 className="font-syne text-lg font-bold text-[#E0E6F4]">{te('noEmployees.title')}</h3>
            <p className="text-[13px] text-[#8B93A8] mt-1">{te('noEmployees.description')}</p>
            <Link
              href="employees/new"
              className={buttonVariants({ className: "mt-5" })}
            >
              <Plus className="me-2 h-4 w-4" />
              {te('noEmployees.cta')}
            </Link>
          </CardContent>
        </Card>
      ) : employees.length === 0 && q ? (
        <div className="py-16 text-center">
          <Search className="h-8 w-8 text-[#4A5168] mx-auto mb-3" />
          <p className="text-[13px] text-[#8B93A8]">{t('noSearchResults')}</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('employeeCode')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('department')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('jobTitle')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                {isHrAdmin && <TableHead>{t('actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar ini={`${emp.firstName[0]}${emp.lastName[0]}`} sz={32} />
                      <div>
                        <div className="font-medium text-[#E0E6F4]">{emp.firstName} {emp.lastName}</div>
                        <div className="text-[12px] text-[#4A5168]">{emp.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-[#8B93A8]">
                    {emp.employeeCode}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{emp.department}</TableCell>
                  <TableCell className="hidden md:table-cell">{emp.jobTitle}</TableCell>
                  <TableCell>
                    <Badge variant={emp.user.isActive ? 'green' : 'red'}>
                      {emp.user.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                  {isHrAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ResetPasswordButton userId={emp.user.id} />
                        {emp.user.isActive && emp.user.id !== session?.user.id && (
                          <DeactivateButton userId={emp.user.id} />
                        )}
                      </div>
                    </TableCell>
                  )}
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
            >{t('previous')}</Link>
          )}
          <span className="text-[13px] text-[#8B93A8] px-2">
            {t('page')} {page} {t('of')} {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?page=${page + 1}${q ? `&q=${q}` : ''}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >{t('next')}</Link>
          )}
        </div>
      )}
    </div>
  )
}

export default function EmployeesPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  return (
    <Suspense fallback={<EmployeesSkeleton />}>
      <EmployeesData searchParams={props.searchParams} />
    </Suspense>
  )
}
