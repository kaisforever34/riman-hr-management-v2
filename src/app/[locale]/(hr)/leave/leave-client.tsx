'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { submitLeaveForEmployee, cancelLeave } from '@/lib/actions/leave'
import { CalendarPlus, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaveTypeItem { id: string; name: string; defaultDays: number; requiresAttachment: boolean }
interface RequestItem {
  id: string
  startDate: string
  endDate: string
  durationDays: number
  status: string
  reason: string | null
  leaveType: { name: string }
}
interface BalanceItem { allocated: number; carriedOver: number; used: number; leaveType: { name: string } }

interface Props {
  employeeId: string
  employees: { id: string; firstName: string; lastName: string }[]
  isApprover: boolean
  leaveTypes: LeaveTypeItem[]
  requests: RequestItem[]
  balances: BalanceItem[]
}

export function LeaveClient({ employeeId, employees, isApprover, leaveTypes, requests, balances }: Props) {
  const t = useTranslations('leave')
  const tl = useTranslations('leave')
  const router = useRouter()
  const pathname = usePathname()
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [halfDayPeriod, setHalfDayPeriod] = useState('')
  const [reason, setReason] = useState('')

  function selectEmployee(id: string) {
    router.push(`${pathname}?employee=${id}`)
  }

  async function handleSubmit() {
    if (!leaveTypeId || !startDate || !endDate) {
      toast.error(t('fillRequired'))
      return
    }
    setBusy(true)
    const fd = new FormData()
    fd.append('employeeId', employeeId)
    fd.append('leaveTypeId', leaveTypeId)
    fd.append('startDate', startDate)
    fd.append('endDate', endDate)
    fd.append('isHalfDay', String(isHalfDay))
    if (halfDayPeriod) fd.append('halfDayPeriod', halfDayPeriod)
    if (reason) fd.append('reason', reason)
    const res = await submitLeaveForEmployee(fd)
    setBusy(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success(t('submitSuccess'))
    setShowForm(false)
    setLeaveTypeId('')
    setStartDate('')
    setEndDate('')
    setIsHalfDay(false)
    setHalfDayPeriod('')
    setReason('')
    router.refresh()
  }

  async function handleCancel(id: string) {
    const fd = new FormData()
    fd.append('id', id)
    const res = await cancelLeave(fd)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success(t('cancelSuccess'))
    router.refresh()
  }

  const statusColor: Record<string, string> = {
    APPROVED: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    REJECTED: 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]',
    CANCELLED: 'bg-[#181E38] text-[#8B93A8]',
    PENDING: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
  }

  return (
    <div className="fi space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-syne text-2xl font-bold text-[#E0E6F4] tracking-tight">{t('title')}</h1>
        <div className="flex items-center gap-2">
          {isApprover && employees.length > 0 && (
            <>
              <span className="text-[13px] text-[#8B93A8]">{t('selectEmployee')}</span>
              <select
                className="rounded-lg border border-[rgba(255,255,255,0.065)] bg-[#0D1028] px-3 py-2 text-[13px] text-[#E0E6F4] outline-none focus-visible:border-[rgba(212,168,67,0.4)]"
                value={employeeId}
                onChange={e => selectEmployee(e.target.value)}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </>
          )}
          <Button onClick={() => setShowForm(!showForm)}>
            <CalendarPlus className="me-2 h-4 w-4" />
            {t('requestLeave')}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{t('requestLeave')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs">{t('type')} *</Label>
                <select
                  className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                  value={leaveTypeId}
                  onChange={e => setLeaveTypeId(e.target.value)}
                >
                  <option value="">{t('selectType')}</option>
                  {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">{t('startDate')} *</Label>
                <input type="date" className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t('endDate')} *</Label>
                <input type="date" className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isHalfDay} onChange={e => setIsHalfDay(e.target.checked)} className="accent-[#22C55E]" />
                {t('halfDay')}
              </label>
              {isHalfDay && (
                <select className="rounded border bg-[#0D1028] px-3 py-1.5 text-sm" value={halfDayPeriod} onChange={e => setHalfDayPeriod(e.target.value)}>
                  <option value="MORNING">{t('morning')}</option>
                  <option value="AFTERNOON">{t('afternoon')}</option>
                </select>
              )}
            </div>
            <div>
              <Label className="text-xs">{t('reason')}</Label>
              <textarea rows={2} className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={busy}>{busy ? '...' : t('submit')}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={busy}>{t('cancelBtn')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {balances.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {balances.map((b, i) => {
            const remaining = b.allocated + b.carriedOver - b.used
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="text-xs text-[#8B93A8]">{b.leaveType.name}</p>
                  <p className="text-2xl font-bold text-[#E0E6F4]">{remaining}</p>
                  <p className="text-[11px] text-[#4A5168]">{t('remaining')} · {b.used} {t('used')}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {t('history')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#8B93A8]">{t('noRequests')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
                    <th className="p-3 font-medium">{t('type')}</th>
                    <th className="p-3 font-medium">{t('startDate')}</th>
                    <th className="p-3 font-medium">{t('endDate')}</th>
                    <th className="p-3 font-medium">{t('duration')}</th>
                    <th className="p-3 font-medium">{t('status')}</th>
                    <th className="p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="p-3">{r.leaveType.name}</td>
                      <td className="p-3">{new Date(r.startDate).toLocaleDateString()}</td>
                      <td className="p-3">{new Date(r.endDate).toLocaleDateString()}</td>
                      <td className="p-3">{r.durationDays}d</td>
                      <td className="p-3">
                        <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', statusColor[r.status] || '')}>
                          {tl(`statuses.${r.status}`)}
                        </span>
                      </td>
                      <td className="p-3">
                        {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                          <button onClick={() => handleCancel(r.id)} className="text-xs text-[#EF4444] hover:underline">
                            {t('cancelBtn')}
                          </button>
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
