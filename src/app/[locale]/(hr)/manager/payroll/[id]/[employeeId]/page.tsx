import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PayslipEditForm } from './payslip-edit-client'

export const dynamic = 'force-dynamic'

export default async function PayslipDetailPage({ params }: { params: Promise<{ id: string; employeeId: string }> }) {
  const { id, employeeId } = await params
  const t = await getTranslations('managerPayroll')
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return null

  const payslip = await db.payslip.findFirst({
    where: { payrollPeriodId: id, employeeId },
    include: {
      payrollPeriod: true,
      employee: { select: { firstName: true, lastName: true, department: true, jobTitle: true, salary: true } },
    },
  })
  if (!payslip) return notFound()

  const monthName = format(new Date(payslip.payrollPeriod.year, payslip.payrollPeriod.month - 1), 'MMMM yyyy')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/manager/payroll/${id}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('title')}
        </Link>
        {session.user.role === 'HR_ADMIN' && (
          <PayslipEditForm
            payslipId={payslip.id}
            bonusPay={Number(payslip.bonusPay ?? 0)}
            overtimePay={Number(payslip.overtimePay ?? 0)}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{payslip.employee.firstName} {payslip.employee.lastName}</CardTitle>
          <p className="text-sm text-[#8B93A8]">{payslip.employee.department} — {payslip.employee.jobTitle}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between border-b py-2">
              <span>{t('period')}</span>
              <span className="font-medium">{monthName}</span>
            </div>

            <div className="border-b py-1 text-sm font-semibold text-muted-foreground">{t('earnings')}</div>
            <div className="flex justify-between border-b py-2">
              <span>{t('basicSalary')}</span>
              <span className="font-medium">{Number(payslip.basicSalary).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span>{t('housingAllowance')}</span>
              <span>{Number(payslip.housingAllowance).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span>{t('transportAllowance')}</span>
              <span>{Number(payslip.transportAllowance).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span>{t('otherAllowances')}</span>
              <span>{Number(payslip.otherAllowances).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span>{t('overtimePay')}</span>
              <span>{Number(payslip.overtimePay).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span>{t('bonusPay')}</span>
              <span>{(payslip.bonusPay ?? 0) > 0 ? `+${Number(payslip.bonusPay).toFixed(2)}` : '0.00'}</span>
            </div>
            <div className="flex justify-between border-b py-2 font-medium">
              <span>{t('totalGross')}</span>
              <span>{Number(payslip.totalGross).toFixed(2)}</span>
            </div>

            <div className="border-b py-1 text-sm font-semibold text-muted-foreground">{t('deductions')}</div>
            <div className="flex justify-between border-b py-2 text-audit-red">
              <span>{t('transportDeduction')}</span>
              <span>{Number(payslip.transportationDeduction) > 0 ? `-${Number(payslip.transportationDeduction).toFixed(2)}` : '0.00'}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-audit-red">
              <span>{t('absenceDeduction')}</span>
              <span>{Number(payslip.absenceDeduction) > 0 ? `-${Number(payslip.absenceDeduction).toFixed(2)}` : '0.00'}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-audit-red">
              <span>{t('lateDeduction')}</span>
              <span>{Number(payslip.lateDeduction) > 0 ? `-${Number(payslip.lateDeduction).toFixed(2)}` : '0.00'}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-audit-red">
              <span>{t('gpssaEmployee')}</span>
              <span>{Number(payslip.gpssaEmployee) > 0 ? `-${Number(payslip.gpssaEmployee).toFixed(2)}` : '0.00'}</span>
            </div>
            <div className="flex justify-between border-b py-2 text-audit-red">
              <span>{t('totalDeductions')}</span>
              <span>{Number(payslip.totalDeductions) > 0 ? `-${Number(payslip.totalDeductions).toFixed(2)}` : '0.00'}</span>
            </div>

            {Number(payslip.eosbAmount) > 0 && (
              <div className="flex justify-between border-b py-2 font-medium">
                <span>{t('eosbAmount')}</span>
                <span>+{Number(payslip.eosbAmount).toFixed(2)}</span>
              </div>
            )}
            {Number(payslip.gpssaEmployer) > 0 && (
              <div className="flex justify-between border-b py-2 text-muted-foreground">
                <span>{t('gpssaEmployer')} (Employer)</span>
                <span>{Number(payslip.gpssaEmployer).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 text-lg font-bold">
              <span>{t('netPay')}</span>
              <span>{Number(payslip.netPay).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
