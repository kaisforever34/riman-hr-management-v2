'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { checkIn, checkOut, manualCheckIn } from '@/lib/actions/attendance'
import { Clock, LogIn, LogOut, CalendarDays } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'

interface RecordData {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  lateMinutes: number
  earlyLeaveMinutes: number
  checkInMethod: string
  checkOutMethod: string | null
  checkInNote: string | null
  checkOutNote: string | null
}

interface Props {
  employeeId: string
  employees: { id: string; firstName: string; lastName: string }[]
  isApprover: boolean
  todayRecord: RecordData | null
  monthlyRecords: RecordData[]
  serverNow: string
}

export function AttendanceClient({ employeeId, employees, isApprover, todayRecord, monthlyRecords, serverNow }: Props) {
  const t = useTranslations('attendance')
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualTime, setManualTime] = useState('')
  const [manualNote, setManualNote] = useState('')

  const doAction = useCallback(async (action: (id?: string) => Promise<{ error?: string } | undefined>, name: string) => {
    setLoading(name)
    setMessage(null)
    const result = await action(employeeId)
    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: name === 'checkIn' ? t('checkInSuccess') : t('checkOutSuccess') })
      router.refresh()
    }
    setLoading('')
  }, [t, employeeId, router])

  const handleManualCheckIn = async () => {
    if (!manualTime || !manualNote) return
    setLoading('manual')
    setMessage(null)
    const form = new FormData()
    form.set('checkIn', manualTime)
    form.set('note', manualNote)
    form.set('employeeId', employeeId)
    const result = await manualCheckIn(form)
    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: t('checkInSuccess') })
      setShowManual(false)
      router.refresh()
    }
    setLoading('')
  }

  function selectEmployee(id: string) {
    router.push(`${pathname}?employee=${id}`)
  }

  const now = new Date(serverNow)
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthStart = startOfMonth(new Date(currentYear, currentMonth))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const statusColor: Record<string, string> = {
    PRESENT: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    LATE: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
    ABSENT: 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]',
    HALF_DAY: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
  }

  return (
    <div className="fi space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-syne text-2xl font-bold text-[#E0E6F4] tracking-tight">{t('title')}</h1>
        {isApprover && employees.length > 0 && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', message.type === 'success' ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' : 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]')}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('today')} — {format(now, 'PPP')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayRecord?.checkIn ? (
            <div className="space-y-2">
              <p className="text-[13px] text-[#8B93A8]">
                {t('checkedInAt')}: {format(new Date(todayRecord.checkIn), 'HH:mm')}
                {todayRecord.lateMinutes > 0 && (
                  <span className="ms-2 text-[#F59E0B]">{t('minLate', { minutes: todayRecord.lateMinutes })}</span>
                )}
              </p>
              {todayRecord.checkOut ? (
                <p className="text-[13px] text-[#8B93A8]">
                  {t('checkedOutAt')}: {format(new Date(todayRecord.checkOut), 'HH:mm')}
                  {todayRecord.earlyLeaveMinutes > 0 && (
                    <span className="ms-2 text-[#F59E0B]">{t('minEarly', { minutes: todayRecord.earlyLeaveMinutes })}</span>
                  )}
                </p>
              ) : (
                <Button onClick={() => doAction(checkOut, 'checkOut')} disabled={loading === 'checkOut'}>
                  <LogOut className="me-2 h-4 w-4" />
                  {loading === 'checkOut' ? '...' : t('checkOut')}
                </Button>
              )}
              <p className="text-[12px] text-[#4A5168]">
                {t('status')}: <span className={cn('inline-block rounded px-1.5 py-0.5 text-[11.5px] font-semibold', statusColor[todayRecord.status] || '')}>{t(todayRecord.status.toLowerCase())}</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => doAction(checkIn, 'checkIn')} disabled={loading === 'checkIn'}>
                <LogIn className="me-2 h-4 w-4" />
                {loading === 'checkIn' ? '...' : t('checkIn')}
              </Button>
              <Button variant="outline" onClick={() => setShowManual(!showManual)}>
                {t('manualCheckIn')}
              </Button>
            </div>
          )}

          {showManual && !todayRecord?.checkIn && (
            <div className="space-y-2 rounded-lg border border-[rgba(255,255,255,0.065)] bg-[#131830] p-3">
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-[rgba(255,255,255,0.065)] bg-[#0D1028] px-3 py-2 text-[13px] text-[#E0E6F4] outline-none focus-visible:border-[rgba(212,168,67,0.4)]"
                value={manualTime}
                onChange={e => setManualTime(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-[rgba(255,255,255,0.065)] bg-[#0D1028] px-3 py-2 text-[13px] text-[#E0E6F4] outline-none focus-visible:border-[rgba(212,168,67,0.4)] placeholder:text-[#4A5168]"
                placeholder={t('reason')}
                rows={2}
                value={manualNote}
                onChange={e => setManualNote(e.target.value)}
              />
              <Button onClick={handleManualCheckIn} disabled={loading === 'manual' || !manualTime || !manualNote}>
                {loading === 'manual' ? '...' : t('manualCheckIn')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {format(monthStart, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-1 text-[11px] font-semibold tracking-[0.06em] uppercase text-[#4A5168]">{d}</div>
            ))}
            {Array.from({ length: getDay(monthStart) }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(day => {
              const record = monthlyRecords.find(r => isSameDay(new Date(r.date), day))
              const col = statusColor[record?.status || ''] || ''
              const todayCls = isToday(day) ? 'ring-2 ring-[#4B8BF0]' : ''
              return (
                <div
                  key={day.toISOString()}
                  className={cn('rounded p-1 text-[12px]', col, todayCls, record ? 'cursor-default' : 'text-[#4A5168]')}
                >
                  {format(day, 'd')}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
