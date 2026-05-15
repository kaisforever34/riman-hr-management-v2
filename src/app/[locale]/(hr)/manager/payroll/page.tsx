import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getPayrollPeriods } from '@/lib/queries/payroll'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PayrollPage() {
  const t = await getTranslations('payroll')
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const periods = await getPayrollPeriods()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('periods')}</p>
        </div>
        <Link href="/manager/payroll/new" className={buttonVariants()}>
          <Plus className="me-2 h-4 w-4" />
          {t('newPeriod')}
        </Link>
      </div>

      {periods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-ledger-text-muted" />
            <h3 className="text-lg font-medium">{t('noPeriods')}</h3>
            <p className="text-sm text-muted-foreground">{t('noPeriodsDesc')}</p>
            <Link
              href="/manager/payroll/new"
              className={buttonVariants({ className: 'mt-4' })}
            >
              <Plus className="me-2 h-4 w-4" />
              {t('newPeriod')}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                    <th className="px-4 py-3 text-start font-medium">{t('periods')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('employees')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {periods.map(p => {
                    const monthName = format(new Date(p.year, p.month - 1), 'MMMM yyyy')
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                        <td className="px-4 py-3 font-medium">{monthName}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                            p.status === 'DRAFT' ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]' : 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
                          )}>
                            {p.status === 'DRAFT' ? t('draft') : t('finalized')}
                          </span>
                        </td>
                        <td className="px-4 py-3">{p._count.payslips}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/manager/payroll/${p.id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
