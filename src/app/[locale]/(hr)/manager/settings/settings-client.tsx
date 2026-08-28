'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateSettings } from '@/lib/actions/settings'
import { SETTING_DEFINITIONS, SETTING_GROUPS, type SettingDefinition, type SettingGroup } from '@/lib/settings-defs'
import { cn } from '@/lib/utils'
import { Save, Building2, Clock, Wallet, CalendarDays, List, ShieldCheck } from 'lucide-react'

const GROUP_ICONS: Record<SettingGroup, typeof Clock> = {
  company: Building2,
  shift: Clock,
  payroll: Wallet,
  leave: CalendarDays,
  lists: List,
  policies: ShieldCheck,
}

const inputCls =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-[13.5px] text-ledger-text transition-colors outline-none placeholder:text-ledger-text-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring'

function Field({
  def,
  value,
  onChange,
  t,
}: {
  def: SettingDefinition
  value: string
  onChange: (key: string, val: string) => void
  t: ReturnType<typeof useTranslations<'settings'>>
}) {
  const label = t(`field_${def.key}`)
  const hasHint = t.has(`hint_${def.key}`)
  const hint = hasHint ? t(`hint_${def.key}`) : null

  return (
    <div className={cn('space-y-1.5', def.text && !def.options && 'sm:col-span-2')}>
      <label className="text-xs font-medium text-ledger-text-secondary" htmlFor={`setting-${def.key}`}>
        {label}
        {def.percent ? ' %' : ''}
      </label>
      {def.options ? (
        <select
          id={`setting-${def.key}`}
          className={inputCls}
          value={value}
          onChange={e => onChange(def.key, e.target.value)}
        >
          {def.options.map(opt => (
            <option key={opt} value={opt}>
              {t.has(`opt_${def.key}_${opt}`) ? t(`opt_${def.key}_${opt}`) : opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`setting-${def.key}`}
          type={def.text ? 'text' : 'number'}
          step={def.step}
          min={def.min}
          max={def.max}
          className={inputCls}
          value={value}
          onChange={e => onChange(def.key, e.target.value)}
        />
      )}
      {hint && <p className="text-[11px] text-ledger-text-muted">{hint}</p>}
    </div>
  )
}

export default function SettingsClient({ settings }: { settings: Record<string, string> }) {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const [values, setValues] = useState<Record<string, string>>(settings)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (key: string, val: string) => {
    setValues(v => ({ ...v, [key]: val }))
  }

  const handleSave = async () => {
    setMessage('')
    setLoading(true)
    const fd = new FormData()
    for (const def of SETTING_DEFINITIONS) {
      const v = values[def.key]
      if (v !== undefined) fd.set(def.key, String(v))
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
        <p className="text-sm text-ledger-text-secondary">{t('subtitle')}</p>
      </div>

      {message && (
        <div
          className={cn(
            'rounded-md p-3 text-sm',
            String(message).toLowerCase().includes('fail') || String(message).toLowerCase().includes('error')
              ? 'bg-destructive/10 text-destructive'
              : 'bg-statement-green/10 text-statement-green',
          )}
        >
          {message}
        </div>
      )}

      {SETTING_GROUPS.map(group => {
        const defs = SETTING_DEFINITIONS.filter(d => d.group === group)
        if (defs.length === 0) return null
        const Icon = GROUP_ICONS[group]
        return (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gold" />
                {t(`group_${group}`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {defs.map(def => (
                  <Field
                    key={def.key}
                    def={def}
                    value={values[def.key] ?? ''}
                    onChange={handleChange}
                    t={t}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? t('saving') : <><Save className="me-2 h-4 w-4" />{tc('save')}</>}
        </Button>
      </div>
    </div>
  )
}
