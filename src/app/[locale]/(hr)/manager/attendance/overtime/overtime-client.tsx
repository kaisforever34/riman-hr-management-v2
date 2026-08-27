'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { submitOvertime, approveOvertime } from '@/lib/actions/attendance'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Plus, Check, X } from 'lucide-react'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  department: string
}

interface RecordData {
  id: string
  employeeId: string
  employeeName: string
  department: string
  date: string
  minutes: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt: string | null
}

interface Props {
  employees: EmployeeData[]
  records: RecordData[]
}

export function OvertimeClient({ employees, records }: Props) {
  const t = useTranslations('overtime')
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ employeeId: '', date: new Date().toISOString().split('T')[0], minutes: '60', reason: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState('')

  const statusBadge: Record<string, string> = {
    PENDING: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
    APPROVED: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    REJECTED: 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]',
  }

  const filtered = filter === 'ALL' ? records : records.filter(r => r.status === filter)

  const handleSubmit = async () => {
    setMessage('')
    setLoading('submit')
    const fd = new FormData()
    fd.set('employeeId', form.employeeId)
    fd.set('date', form.date)
    fd.set('minutes', form.minutes)
    fd.set('reason', form.reason)
    const result = await submitOvertime(fd)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setMessage(t('submitSuccess'))
      setShowForm(false)
      setForm({ employeeId: '', date: new Date().toISOString().split('T')[0], minutes: '60', reason: '' })
    }
    setLoading('')
  }

  const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setMessage('')
    setLoading(id)
    const fd = new FormData()
    fd.set('id', id)
    fd.set('status', status)
    const result = await approveOvertime(fd)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setMessage(status === 'APPROVED' ? t('approved') : t('rejected'))
    }
    setLoading('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-[#8B93A8]">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          <Plus className="me-2 h-4 w-4" />
          {t('addOvertime')}
        </Button>
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', String(message).toLowerCase().includes('fail') || String(message).toLowerCase().includes('error') ? 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]' : 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]')}>
          {message}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('addOvertime')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[#8B93A8]">{t('employee')} *</label>
                <select
                  className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                  value={form.employeeId}
                  onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} — {emp.department}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B93A8]">{t('date')} *</label>
                <input
                  type="date"
                  className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B93A8]">{t('minutes')} *</label>
                <input
                  type="number"
                  min={15}
                  className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                  value={form.minutes}
                  onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('reason')} *</label>
              <textarea
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={loading === 'submit'}>{t('save')}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[13px] font-medium border',
              filter === status
                ? 'bg-[rgba(212,168,67,0.12)] text-[#EFC254] border-[rgba(212,168,67,0.2)]'
                : 'text-[#8B93A8] border-[rgba(255,255,255,0.08)] hover:text-[#E0E6F4]'
            )}
          >
            {t(`filter.${status.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8B93A8]">{t('noRecords')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                    <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('department')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('date')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('hours')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('reason')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="px-4 py-3">{r.employeeName}</td>
                      <td className="px-4 py-3 text-[#8B93A8]">{r.department}</td>
                      <td className="px-4 py-3 text-[#8B93A8]">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3">{(r.minutes / 60).toFixed(2)}h</td>
                      <td className="px-4 py-3 text-[#8B93A8]">{r.reason}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-block rounded px-1.5 py-0.5 text-xs font-medium', statusBadge[r.status])}>
                          {t(`status.${r.status.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleApprove(r.id, 'APPROVED')} disabled={loading === r.id}>
                              <Check className="h-3.5 w-3.5 text-[#22C55E]" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleApprove(r.id, 'REJECTED')} disabled={loading === r.id}>
                              <X className="h-3.5 w-3.5 text-[#EF4444]" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
