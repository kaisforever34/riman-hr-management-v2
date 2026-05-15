'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createPayrollPeriod } from '@/lib/actions/payroll'

export default function NewPayrollPeriodPage() {
  const t = useTranslations('payroll')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const form = new FormData()
    form.set('month', String(month))
    form.set('year', String(year))
    const result = await createPayrollPeriod(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('newPeriod')}</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t('selectMonth')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-[rgba(239,68,68,0.08)] p-3 text-sm text-[#EF4444]">{error}</div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('selectMonth')}</label>
            <select
              className="w-full rounded border bg-card px-3 py-2 text-sm"
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('selectYear')}</label>
            <select
              className="w-full rounded border bg-card px-3 py-2 text-sm"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {[year - 1, year, year + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? t('processing') : t('process')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
