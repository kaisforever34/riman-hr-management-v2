'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { EmployeePicker } from '@/components/employee-picker'
import { cn } from '@/lib/utils'

interface PayslipItem {
  id: string
  employeeId: string
  totalGross: number
  totalDeductions: number
  netPay: number
  payrollPeriod: { id: string; month: number; year: number; status: string }
}

interface PeriodItem {
  id: string
  month: number
  year: number
  status: string
  _count: { payslips: number }
}

interface Props {
  employeeId: string
  employees: { id: string; firstName: string; lastName: string }[]
  payslips: PayslipItem[]
  periods: PeriodItem[]
}

export function PayrollClient({ employeeId, employees, payslips, periods }: Props) {
  const t = useTranslations('payroll')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <EmployeePicker employees={employees} employeeId={employeeId} label={t('selectEmployee')} />
          <Link href="/manager/payroll/new" className={buttonVariants()}>
            <Plus className="me-2 h-4 w-4" />
            {t('newPeriod')}
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('employeePayslips')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payslips.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#8B93A8]">{t('noPayslips')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                    <th className="px-4 py-3 text-start font-medium">{t('period')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                    <th className="px-4 py-3 text-end font-medium">{t('totalGross')}</th>
                    <th className="px-4 py-3 text-end font-medium">{t('totalDeductions')}</th>
                    <th className="px-4 py-3 text-end font-medium">{t('netPay')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(slip => (
                    <tr key={slip.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="px-4 py-3 font-medium">
                        {format(new Date(slip.payrollPeriod.year, slip.payrollPeriod.month - 1), 'MMMM yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                          slip.payrollPeriod.status === 'DRAFT' ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]' : 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
                        )}>
                          {slip.payrollPeriod.status === 'DRAFT' ? t('draft') : t('finalized')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">{slip.totalGross.toFixed(2)}</td>
                      <td className="px-4 py-3 text-end text-audit-red">{slip.totalDeductions.toFixed(2)}</td>
                      <td className="px-4 py-3 text-end font-medium">{slip.netPay.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/manager/payroll/${slip.payrollPeriod.id}/${slip.employeeId}`}
                          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        >
                          {t('viewPayslip')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {periods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-[#4A5168]" />
            <h3 className="text-lg font-medium">{t('noPeriods')}</h3>
            <p className="text-sm text-[#8B93A8]">{t('noPeriodsDesc')}</p>
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
