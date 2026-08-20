'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { recalculatePayslips, updateLateDeduction, finalizePayroll } from '@/lib/actions/payroll'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface PayslipData {
  id: string
  employeeId: string
  employeeName: string
  department: string
  basicSalary: number
  transportationDeduction: number
  absenceDeduction: number
  lateDeduction: number
  netPay: number
}

interface Props {
  period: { id: string; month: number; year: number; status: string }
  payslips: PayslipData[]
}

export function PeriodClient({ period, payslips }: Props) {
  const t = useTranslations('managerPayroll')
  const tp = useTranslations('payroll')
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showFinalize, setShowFinalize] = useState(false)
  const isDraft = period.status === 'DRAFT'

  const handleRecalculate = async () => {
    setLoading('recalculate')
    setMessage('')
    const form = new FormData()
    form.set('periodId', period.id)
    const result = await recalculatePayslips(form)
    if (result?.error) setMessage(result.error)
    setLoading('')
  }

  const handleFinalize = async () => {
    setLoading('finalize')
    setMessage('')
    const form = new FormData()
    form.set('periodId', period.id)
    const result = await finalizePayroll(form)
    if (result?.error) {
      setMessage(result.error)
    }
    setLoading('')
    setShowFinalize(false)
  }

  const handleSaveLateDeduction = async (payslipId: string) => {
    setLoading(payslipId)
    setMessage('')
    const form = new FormData()
    form.set('payslipId', payslipId)
    form.set('lateDeduction', editValue)
    const result = await updateLateDeduction(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setEditingId(null)
    }
    setLoading('')
  }

  const monthName = format(new Date(period.year, period.month - 1), 'MMMM yyyy')
  const totalNetPay = payslips.reduce((sum, s) => sum + s.netPay, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{monthName}</h1>
          <span className={cn(
            'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
            isDraft ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]' : 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
          )}>
            {isDraft ? tp('draft') : tp('finalized')}
          </span>
        </div>
        {isDraft && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRecalculate} disabled={loading === 'recalculate'}>
              {loading === 'recalculate' ? '...' : t('recalculate')}
            </Button>
            <Button onClick={() => setShowFinalize(true)}>
              {t('finalize')}
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', message.includes('Failed') || message.includes('error') ? 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]' : 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]')}>
          {message}
        </div>
      )}

      {showFinalize && (
        <Card className="border-warning-amber/30 bg-warning-amber/10">
          <CardContent className="p-4">
            <p className="mb-3 text-sm">{t('finalizeConfirm')}</p>
            <div className="flex gap-2">
              <Button onClick={handleFinalize} disabled={loading === 'finalize'}>
                {loading === 'finalize' ? '...' : t('confirm')}
              </Button>
              <Button variant="outline" onClick={() => setShowFinalize(false)}>{t('cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                  <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('department')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('basicSalary')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('transportDeduction')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('absenceDeduction')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('lateDeduction')}</th>
                  <th className="px-4 py-3 text-end font-medium">{t('netPay')}</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(slip => (
                  <tr key={slip.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="px-4 py-3">{slip.employeeName}</td>
                    <td className="px-4 py-3 text-[#8B93A8]">{slip.department}</td>
                    <td className="px-4 py-3 text-end">{slip.basicSalary.toFixed(2)}</td>
                    <td className="px-4 py-3 text-end text-audit-red">{slip.transportationDeduction > 0 ? `-${slip.transportationDeduction.toFixed(2)}` : '0.00'}</td>
                    <td className="px-4 py-3 text-end text-audit-red">{slip.absenceDeduction > 0 ? `-${slip.absenceDeduction.toFixed(2)}` : '0.00'}</td>
                    <td className="px-4 py-3 text-end">
                      {editingId === slip.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            className="w-20 rounded border bg-[#0D1028] px-2 py-1 text-end text-sm"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            min="0"
                            step="0.01"
                          />
                          <Button size="sm" onClick={() => handleSaveLateDeduction(slip.id)} disabled={loading === slip.id}>
                            {t('saveLateDeduction')}
                          </Button>
                        </span>
                      ) : (
                        <span
                          className={cn('cursor-pointer', isDraft && 'hover:text-[#4B8BF0]')}
                          onClick={() => {
                            if (!isDraft) return
                            setEditingId(slip.id)
                            setEditValue(String(slip.lateDeduction))
                          }}
                        >
                          {slip.lateDeduction > 0 ? `-${slip.lateDeduction.toFixed(2)}` : '0.00'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end font-medium">{slip.netPay.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-[rgba(255,255,255,0.03)] font-medium">
                  <td className="px-4 py-3" colSpan={2}>{t('total')}</td>
                  <td className="px-4 py-3 text-end">{payslips.reduce((s, p) => s + p.basicSalary, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-end text-audit-red">{payslips.reduce((s, p) => s + p.transportationDeduction, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-end text-audit-red">{payslips.reduce((s, p) => s + p.absenceDeduction, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-end text-audit-red">{payslips.reduce((s, p) => s + p.lateDeduction, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-end">{totalNetPay.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
