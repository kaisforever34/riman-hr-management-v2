'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateSettings } from '@/lib/actions/settings'
import { cn } from '@/lib/utils'
import { Save } from 'lucide-react'

const FIELDS = [
  { key: 'GPSSA_EMPLOYEE_RATE', step: 0.5, min: 0, max: 100, percent: true },
  { key: 'GPSSA_EMPLOYER_RATE', step: 0.5, min: 0, max: 100, percent: true },
  { key: 'EOSB_CAP_MONTHS', step: 1, min: 0, max: 60 },
  { key: 'GRACE_PERIOD_MINUTES', step: 1, min: 0, max: 60 },
  { key: 'AUTO_CLOCKOUT_HOUR', step: 1, min: 0, max: 23 },
  { key: 'AUTO_CLOCKOUT_MINUTE', step: 5, min: 0, max: 59 },
  { key: 'MAX_CARRYOVER_DAYS', step: 1, min: 0, max: 365 },
  { key: 'MAX_CONSECUTIVE_LEAVE_DAYS', step: 1, min: 1, max: 365 },
] as const

export default function SettingsClient({ settings }: { settings: Record<string, string> }) {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const [values, setValues] = useState<Record<string, string>>(settings)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setMessage('')
    setLoading(true)
    const fd = new FormData()
    for (const field of FIELDS) {
      const v = values[field.key]
      if (v !== undefined) fd.set(field.key, String(v))
    }
    const result = await updateSettings(fd)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setMessage(t('saved'))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-[#8B93A8]">{t('subtitle')}</p>
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', String(message).toLowerCase().includes('fail') || String(message).toLowerCase().includes('error') ? 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]' : 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]')}>
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('payrollSection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('gpssaEmployee')}</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={values.GPSSA_EMPLOYEE_RATE ?? ''}
                onChange={e => setValues(v => ({ ...v, GPSSA_EMPLOYEE_RATE: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('gpssaEmployer')}</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={values.GPSSA_EMPLOYER_RATE ?? ''}
                onChange={e => setValues(v => ({ ...v, GPSSA_EMPLOYER_RATE: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('eosbCapMonths')}</label>
              <input
                type="number"
                step="1"
                min="0"
                max="60"
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={values.EOSB_CAP_MONTHS ?? ''}
                onChange={e => setValues(v => ({ ...v, EOSB_CAP_MONTHS: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('attendanceSection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('gracePeriod')}</label>
              <input
                type="number"
                step="1"
                min="0"
                max="60"
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={values.GRACE_PERIOD_MINUTES ?? ''}
                onChange={e => setValues(v => ({ ...v, GRACE_PERIOD_MINUTES: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('autoClockoutHour')}</label>
              <input
                type="number"
                step="1"
                min="0"
                max="23"
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={values.AUTO_CLOCKOUT_HOUR ?? ''}
                onChange={e => setValues(v => ({ ...v, AUTO_CLOCKOUT_HOUR: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('autoClockoutMinute')}</label>
              <input
                type="number"
                step="5"
                min="0"
                max="59"
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={values.AUTO_CLOCKOUT_MINUTE ?? ''}
                onChange={e => setValues(v => ({ ...v, AUTO_CLOCKOUT_MINUTE: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('leaveSection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('maxCarryover')}</label>
              <input
                type="number"
                step="1"
                min="0"
                max="365"
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={values.MAX_CARRYOVER_DAYS ?? ''}
                onChange={e => setValues(v => ({ ...v, MAX_CARRYOVER_DAYS: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('maxConsecutive')}</label>
              <input
                type="number"
                step="1"
                min="1"
                max="365"
                className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                value={values.MAX_CONSECUTIVE_LEAVE_DAYS ?? ''}
                onChange={e => setValues(v => ({ ...v, MAX_CONSECUTIVE_LEAVE_DAYS: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? t('saving') : <><Save className="me-2 h-4 w-4" />{tc('save') || t('save')}</>}
        </Button>
      </div>
    </div>
  )
}
