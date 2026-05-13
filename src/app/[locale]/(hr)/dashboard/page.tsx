import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Users, CalendarCheck, Clock, Plus } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const te = await getTranslations('empty')

  const [totalEmployees] = await Promise.all([
    db.employee.count({ where: { isActive: true } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              {t('totalEmployees')}
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <Link href="/employees" className="text-xs text-zinc-500 hover:underline">
              {t('viewAll')}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              {t('pendingLeaves')}
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-zinc-500">--</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              {t('todayAttendance')}
            </CardTitle>
            <Clock className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-zinc-500">{t('present')}</p>
          </CardContent>
        </Card>
      </div>

      {totalEmployees === 0 ? (
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
      ) : (
        <div className="flex justify-end">
          <Link
            href="employees/new"
            className={buttonVariants()}
          >
            <Plus className="me-2 h-4 w-4" />
            {t('addEmployee')}
          </Link>
        </div>
      )}
    </div>
  )
}
