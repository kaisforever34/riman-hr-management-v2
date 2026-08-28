'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deleteReview, submitReview, approveReview } from '@/lib/actions/performance'
import { ArrowLeft, Trash2, Send, Check } from 'lucide-react'
import { useState } from 'react'

interface RatingData {
  id: string
  criteriaName: string
  rating: string
  comment: string | null
}

interface GoalData {
  id: string
  description: string
  targetDate: string | null
  isCompleted: boolean
}

interface ReviewDetail {
  id: string
  employeeName: string
  department: string
  jobTitle: string
  year: number
  quarter: number
  overallRating: string | null
  comments: string | null
  bonusRecommendation: number | null
  status: string
  createdAt: string
  ratings: RatingData[]
  goals: GoalData[]
}

interface Props {
  review: ReviewDetail
  currency?: string
}

export function ReviewDetailClient({ review, currency = 'AED' }: Props) {
  const t = useTranslations('performance')
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [message, setMessage] = useState('')

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return
    const form = new FormData()
    form.set('id', review.id)
    const result = await deleteReview(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      router.push(`/${locale}/manager/performance`)
      router.refresh()
    }
  }

  const handleSubmit = async () => {
    const form = new FormData()
    form.set('id', review.id)
    const result = await submitReview(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setMessage('')
      router.refresh()
    }
  }

  const handleApprove = async () => {
    const form = new FormData()
    form.set('id', review.id)
    const result = await approveReview(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setMessage('')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/manager/performance`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t('reviewDetail')}</h1>
        </div>
        <div className="flex items-center gap-2">
          {review.status === 'DRAFT' && (
            <>
              <Button size="sm" onClick={handleSubmit}>
                <Send className="me-2 h-4 w-4" />{t('submit')}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="me-2 h-4 w-4" />{t('delete')}
              </Button>
            </>
          )}
          {review.status === 'SUBMITTED' && (
            <Button size="sm" onClick={handleApprove}>
              <Check className="me-2 h-4 w-4" />{t('approve')}
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-md bg-[rgba(239,68,68,0.08)] p-3 text-sm text-[#EF4444]">{message}</div>
      )}

      <Card>
        <CardHeader><CardTitle>{t('employee')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">{t('employee')}:</span> {review.employeeName}</div>
            <div><span className="font-medium">{t('department')}:</span> {review.department}</div>
            <div><span className="font-medium">{t('year')}/{t('quarter')}:</span> {review.year} / {t(`q${review.quarter}`)}</div>
            <div><span className="font-medium">{t('overallRating')}:</span> {review.overallRating ? t(`ratingValues.${review.overallRating}`) : '-'}</div>
            <div><span className="font-medium">{t('status')}:</span> {t(`statusValues.${review.status}`)}</div>
            {review.bonusRecommendation != null && (
              <div><span className="font-medium">{t('bonusRecommendation', { currency })}:</span> {review.bonusRecommendation.toFixed(2)} {currency}</div>
            )}
          </div>
          {review.comments && (
            <div className="mt-3 text-sm"><span className="font-medium">{t('comments')}:</span> {review.comments}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('ratings')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                  <th className="px-4 py-3 text-start font-medium">{t('criteria')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('rating')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('comment')}</th>
                </tr>
              </thead>
              <tbody>
                {review.ratings.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="px-4 py-3">{r.criteriaName}</td>
                    <td className="px-4 py-3">{t(`ratingValues.${r.rating}`)}</td>
                    <td className="px-4 py-3">{r.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('goals')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                  <th className="px-4 py-3 text-start font-medium">{t('goalDescription')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('targetDate')}</th>
                </tr>
              </thead>
              <tbody>
                {review.goals.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-4 text-center text-[#8B93A8]">-</td></tr>
                ) : review.goals.map(g => (
                  <tr key={g.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="px-4 py-3">{g.description}</td>
                    <td className="px-4 py-3">{g.targetDate ? new Date(g.targetDate).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
