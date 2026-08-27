'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createReview } from '@/lib/actions/performance'
import { Plus, Trash2, Upload } from 'lucide-react'

interface CriteriaData {
  id: string
  name: string
  nameAr: string | null
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
}

interface Props {
  defaultEmployeeId: string
  criteria: CriteriaData[]
  employees: EmployeeData[]
}

interface RatingEntry {
  criteriaId?: string
  customName?: string
  rating: 'EXCEEDS' | 'MEETS' | 'BELOW'
  comment: string
}

interface GoalEntry {
  description: string
  targetDate: string
}

const currentYear = new Date().getFullYear()
const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1

export function NewReviewClient({ defaultEmployeeId, criteria, employees }: Props) {
  const t = useTranslations('performance')
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId)
  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState(currentQuarter)
  const [comments, setComments] = useState('')
  const [bonus, setBonus] = useState('')
  const [ratings, setRatings] = useState<RatingEntry[]>(
    criteria.map(c => ({ criteriaId: c.id, rating: 'MEETS', comment: '' }))
  )
  const [customRatings, setCustomRatings] = useState<RatingEntry[]>([])
  const [goals, setGoals] = useState<GoalEntry[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!employeeId) { setMessage(t('selectEmployee')); return }
    setSaving(true)
    setMessage('')

    const allRatings = [
      ...ratings.filter(r => r.rating),
      ...customRatings.filter(r => r.customName && r.rating),
    ]

    const form = new FormData()
    form.set('employeeId', employeeId)
    form.set('year', String(year))
    form.set('quarter', String(quarter))
    form.set('comments', comments)
    if (bonus) form.set('bonusRecommendation', bonus)
    form.set('ratings', JSON.stringify(allRatings))
    form.set('goals', JSON.stringify(goals.filter(g => g.description)))

    const result = await createReview(form)
    if (result?.error) {
      setMessage(result.error)
      setSaving(false)
    } else {
      router.push(`/${locale}/manager/performance`)
      router.refresh()
    }
  }

  const updateRating = (index: number, field: keyof RatingEntry, value: string) => {
    const updated = [...ratings]
    ;(updated[index] as unknown as Record<string, string>)[field] = value
    setRatings(updated)
  }

  const updateCustomRating = (index: number, field: keyof RatingEntry, value: string) => {
    const updated = [...customRatings]
    ;(updated[index] as unknown as Record<string, string>)[field] = value
    setCustomRatings(updated)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('newReview')}</h1>

      {message && (
        <div className="rounded-md bg-[rgba(239,68,68,0.08)] p-3 text-sm text-[#EF4444]">{message}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{t('employee')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('employee')}</label>
              <select className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={employeeId} onChange={e => setEmployeeId(e.target.value)} required>
                <option value="">{t('employee')}</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-[#8B93A8]">{t('year')}</label>
                <select className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-[#8B93A8]">{t('quarter')}</label>
                <select className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={quarter} onChange={e => setQuarter(parseInt(e.target.value))}>
                  {[1, 2, 3, 4].map(q => (
                    <option key={q} value={q}>{t(`q${q}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('ratings')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {ratings.map((r, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded bg-[rgba(255,255,255,0.03)] p-3">
                <div className="min-w-[150px] flex-1">
                  <label className="text-xs font-medium text-[#8B93A8]">{t('criteria')}</label>
                  <div className="py-2 text-sm font-medium">{criteria[i]?.name}</div>
                </div>
                <div className="min-w-[130px]">
                  <label className="text-xs font-medium text-[#8B93A8]">{t('rating')}</label>
                  <select className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={r.rating} onChange={e => updateRating(i, 'rating', e.target.value)}>
                    <option value="EXCEEDS">{t('ratingValues.EXCEEDS')}</option>
                    <option value="MEETS">{t('ratingValues.MEETS')}</option>
                    <option value="BELOW">{t('ratingValues.BELOW')}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#8B93A8]">{t('comment')}</label>
                  <input className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={r.comment} onChange={e => updateRating(i, 'comment', e.target.value)} />
                </div>
              </div>
            ))}

            {customRatings.map((r, i) => (
              <div key={`c-${i}`} className="flex flex-wrap items-end gap-3 rounded border border-dashed bg-[rgba(255,255,255,0.03)] p-3">
                <div className="min-w-[150px] flex-1">
                  <label className="text-xs font-medium text-[#8B93A8]">{t('customCriteria')}</label>
                  <input className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={r.customName || ''} onChange={e => updateCustomRating(i, 'customName', e.target.value)} placeholder={t('criteriaNamePlaceholder')} />
                </div>
                <div className="min-w-[130px]">
                  <label className="text-xs font-medium text-[#8B93A8]">{t('rating')}</label>
                  <select className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={r.rating} onChange={e => updateCustomRating(i, 'rating', e.target.value)}>
                    <option value="EXCEEDS">{t('ratingValues.EXCEEDS')}</option>
                    <option value="MEETS">{t('ratingValues.MEETS')}</option>
                    <option value="BELOW">{t('ratingValues.BELOW')}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#8B93A8]">{t('comment')}</label>
                  <input className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={r.comment} onChange={e => updateCustomRating(i, 'comment', e.target.value)} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCustomRatings(customRatings.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3 text-audit-red" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={() => setCustomRatings([...customRatings, { rating: 'MEETS', comment: '' }])}>
              <Plus className="me-1 h-3 w-3" />{t('addCriteria')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('goals')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {goals.map((g, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3 rounded bg-[rgba(255,255,255,0.03)] p-3">
                <div className="min-w-[200px] flex-1">
                  <label className="text-xs font-medium text-[#8B93A8]">{t('goalDescription')}</label>
                  <input className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={g.description} onChange={e => {
                    const updated = [...goals]; updated[i].description = e.target.value; setGoals(updated)
                  }} required />
                </div>
                <div className="min-w-[140px]">
                  <label className="text-xs font-medium text-[#8B93A8]">{t('targetDate')}</label>
                  <input type="date" className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" value={g.targetDate} onChange={e => {
                    const updated = [...goals]; updated[i].targetDate = e.target.value; setGoals(updated)
                  }} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setGoals(goals.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3 text-audit-red" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setGoals([...goals, { description: '', targetDate: '' }])}>
              <Plus className="me-1 h-3 w-3" />{t('addGoal')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('comments')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('comments')}</label>
              <textarea className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" rows={3} value={comments} onChange={e => setComments(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[#8B93A8]">{t('bonusRecommendation')}</label>
              <input type="number" step="0.01" min="0" className="w-full max-w-xs rounded border px-3 py-2 text-sm" value={bonus} onChange={e => setBonus(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            <Upload className="me-2 h-4 w-4" />{saving ? t('saving') : t('newReview')}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>{t('cancel')}</Button>
        </div>
      </form>
    </div>
  )
}
