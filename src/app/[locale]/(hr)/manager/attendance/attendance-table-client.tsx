'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { managerOverrideAttendance } from '@/lib/actions/attendance'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Pencil } from 'lucide-react'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  department: string
}

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
  employee: { firstName: string; lastName: string; department: string }
}

interface Props {
  employees: EmployeeData[]
  records: RecordData[]
  todayDate: string
}

export function AttendanceTableClient({ employees, records, todayDate }: Props) {
  const t = useTranslations('managerAttendance')
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [overrideData, setOverrideData] = useState({ checkIn: '', checkOut: '', status: 'PRESENT', note: '' })
  const [message, setMessage] = useState('')

  const recordMap = new Map(records.map(r => [r.employeeId, r]))

  const statusColor: Record<string, string> = {
    PRESENT: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    LATE: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
    ABSENT: 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]',
    HALF_DAY: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
  }

  const handleOverride = async (employeeId: string) => {
    setMessage('')
    const form = new FormData()
    form.set('employeeId', employeeId)
    form.set('date', todayDate)
    if (overrideData.checkIn) form.set('checkIn', overrideData.checkIn)
    if (overrideData.checkOut) form.set('checkOut', overrideData.checkOut)
    if (overrideData.status) form.set('status', overrideData.status)
    if (overrideData.note) form.set('note', overrideData.note)

    const result = await managerOverrideAttendance(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setMessage(t('success.overridden'))
      setOverrideId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('todayAttendance')}</p>
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', message.includes('Failed') ? 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]' : 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]')}>
          {message}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                  <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('department')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('checkIn')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('checkOut')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('lateMinutes')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const record = recordMap.get(emp.id)
                  const isAbsent = !record
                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="px-4 py-3">{emp.firstName} {emp.lastName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.department}</td>
                      <td className="px-4 py-3">
                        {record?.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {record?.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {isAbsent ? (
                          <span className="inline-block rounded bg-[rgba(239,68,68,0.08)] px-1.5 py-0.5 text-xs font-medium text-[#EF4444]">{t('absent')}</span>
                        ) : (
                          <span className={cn('inline-block rounded px-1.5 py-0.5 text-xs font-medium', statusColor[record.status] || '')}>
                            {record.status === 'PRESENT' ? t('present') : record.status === 'LATE' ? t('late') : record.status === 'ABSENT' ? t('absent') : record.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{record?.lateMinutes ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOverrideId(emp.id)
                            setOverrideData({
                              checkIn: record?.checkIn ? format(new Date(record.checkIn), "yyyy-MM-dd'T'HH:mm") : '',
                              checkOut: record?.checkOut ? format(new Date(record.checkOut), "yyyy-MM-dd'T'HH:mm") : '',
                              status: record?.status || 'PRESENT',
                              note: '',
                            })
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {overrideId && (
        <Card>
          <CardHeader>
            <CardTitle>{t('overrideTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('checkIn')}</label>
              <input
                type="datetime-local"
                className="w-full rounded border bg-card px-3 py-2 text-sm"
                value={overrideData.checkIn}
                onChange={e => setOverrideData(d => ({ ...d, checkIn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('checkOut')}</label>
              <input
                type="datetime-local"
                className="w-full rounded border bg-card px-3 py-2 text-sm"
                value={overrideData.checkOut}
                onChange={e => setOverrideData(d => ({ ...d, checkOut: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('status')}</label>
              <select
                className="w-full rounded border bg-card px-3 py-2 text-sm"
                value={overrideData.status}
                onChange={e => setOverrideData(d => ({ ...d, status: e.target.value }))}
              >
                <option value="PRESENT">{t('present')}</option>
                <option value="LATE">{t('late')}</option>
                <option value="ABSENT">{t('absent')}</option>
                <option value="HALF_DAY">{t('halfDay')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('note')}</label>
              <input
                className="w-full rounded border bg-card px-3 py-2 text-sm"
                value={overrideData.note}
                onChange={e => setOverrideData(d => ({ ...d, note: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleOverride(overrideId)}>{t('save')}</Button>
              <Button variant="outline" onClick={() => setOverrideId(null)}>{t('cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
