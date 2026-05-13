'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
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
  todayRecord: RecordData | null
  monthlyRecords: RecordData[]
  serverNow: string
}

export function AttendanceClient({ todayRecord, monthlyRecords, serverNow }: Props) {
  const t = useTranslations('attendance')
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualTime, setManualTime] = useState('')
  const [manualNote, setManualNote] = useState('')

  const doAction = useCallback(async (action: () => Promise<{ error?: string } | undefined>, name: string) => {
    setLoading(name)
    setMessage(null)
    const result = await action()
    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: name === 'checkIn' ? t('checkInSuccess') : t('checkOutSuccess') })
    }
    setLoading('')
  }, [t])

  const handleManualCheckIn = async () => {
    if (!manualTime || !manualNote) return
    setLoading('manual')
    setMessage(null)
    const form = new FormData()
    form.set('checkIn', manualTime)
    form.set('note', manualNote)
    const result = await manualCheckIn(form)
    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: t('checkInSuccess') })
      setShowManual(false)
    }
    setLoading('')
  }

  const now = new Date(serverNow)
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthStart = startOfMonth(new Date(currentYear, currentMonth))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const statusColor: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-700',
    LATE: 'bg-yellow-100 text-yellow-700',
    ABSENT: 'bg-red-100 text-red-700',
    HALF_DAY: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
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
              <p className="text-sm text-zinc-600">
                {t('checkedInAt')}: {format(new Date(todayRecord.checkIn), 'HH:mm')}
                {todayRecord.lateMinutes > 0 && (
                  <span className="ms-2 text-yellow-600">{t('minLate', { minutes: todayRecord.lateMinutes })}</span>
                )}
              </p>
              {todayRecord.checkOut ? (
                <p className="text-sm text-zinc-600">
                  {t('checkedOutAt')}: {format(new Date(todayRecord.checkOut), 'HH:mm')}
                  {todayRecord.earlyLeaveMinutes > 0 && (
                    <span className="ms-2 text-yellow-600">{t('minEarly', { minutes: todayRecord.earlyLeaveMinutes })}</span>
                  )}
                </p>
              ) : (
                <Button onClick={() => doAction(checkOut, 'checkOut')} disabled={loading === 'checkOut'}>
                  <LogOut className="me-2 h-4 w-4" />
                  {loading === 'checkOut' ? '...' : t('checkOut')}
                </Button>
              )}
              <p className="text-xs text-zinc-400">
                {t('status')}: <span className={cn('inline-block rounded px-1.5 py-0.5 text-xs font-medium', statusColor[todayRecord.status] || '')}>{t(todayRecord.status.toLowerCase())}</span>
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
            <div className="space-y-2 rounded border p-3">
              <input
                type="datetime-local"
                className="w-full rounded border px-3 py-2 text-sm"
                value={manualTime}
                onChange={e => setManualTime(e.target.value)}
              />
              <textarea
                className="w-full rounded border px-3 py-2 text-sm"
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
              <div key={d} className="py-1 text-xs font-medium text-zinc-500">{d}</div>
            ))}
            {Array.from({ length: getDay(monthStart) }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(day => {
              const record = monthlyRecords.find(r => isSameDay(new Date(r.date), day))
              const col = statusColor[record?.status || ''] || ''
              const todayCls = isToday(day) ? 'ring-2 ring-blue-500' : ''
              return (
                <div
                  key={day.toISOString()}
                  className={cn('rounded p-1 text-xs', col, todayCls, record ? 'cursor-default' : 'text-zinc-400')}
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
