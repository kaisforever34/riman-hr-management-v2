'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { submitSurveyResponses } from '@/lib/actions/survey'
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

type QuestionItem = {
  id: string
  type: string
  question: string
  options: unknown
  order: number
}

type SurveyItem = {
  id: string
  title: string
  description: string | null
  isAnonymous: boolean
  dueDate: string | null
  questions: QuestionItem[]
}

type AssignmentItem = {
  id: string
  status: string
  completedAt: string | null
  survey: SurveyItem
}

export default function EmployeeSurveyFillClient({ assignment, locale }: { assignment: AssignmentItem; locale: string }) {
  const t = useTranslations('surveys')
  const router = useRouter()
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCompleted = assignment.status === 'COMPLETED' || submitted
  const questions = assignment.survey.questions

  function setResponse(questionId: string, value: string) {
    setResponses((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const unanswered = questions.filter((q) => !responses[q.id])
    if (unanswered.length > 0) {
      setError(t('required'))
      return
    }

    setSubmitting(true)
    const result = await submitSurveyResponses(
      assignment.id,
      questions.map((q) => ({
        questionId: q.id,
        value: q.type === 'RATING' ? Number(responses[q.id]) : responses[q.id],
      }))
    )
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSubmitted(true)
    router.refresh()
  }

  if (isCompleted) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <CheckCircle className="w-12 h-12 text-[#22A854] mx-auto mb-4" />
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4] mb-2">{assignment.survey.title}</h1>
        <p className="text-sm text-[#8B93A8] mb-6">{t('alreadyCompleted')}</p>
        <Link href={`/${locale}/surveys`} className="inline-flex items-center gap-1 text-sm text-[#D4A843] hover:text-[#EFC254]">
          <ArrowLeft className="w-4 h-4" />{t('backToSurveys')}
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href={`/${locale}/surveys`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />{t('backToSurveys')}
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{assignment.survey.title}</h1>
            {assignment.survey.description && <p className="text-sm text-[#8B93A8] mt-1">{assignment.survey.description}</p>}
          </div>
          {assignment.survey.isAnonymous && (
            <span className="text-[10px] px-2 py-0.5 bg-[#D4A843] text-[#07091A] rounded-full font-medium flex-shrink-0">{t('anonymous')}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-[#8B93A8]">
          <span>{questions.length} {t('questions')}</span>
          {assignment.survey.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{t('due')} {new Date(assignment.survey.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] text-[#D4A843] font-medium uppercase">{q.type === 'RATING' ? t('rating') : q.type === 'TEXT' ? t('textAnswer') : t('selectOption')}</span>
                <p className="text-sm font-medium text-[#E0E6F4] mt-0.5">{q.question}</p>
              </div>
              {q.type === 'RATING' && responses[q.id] && (
                <span className="text-lg font-bold text-[#D4A843]">{responses[q.id]}</span>
              )}
            </div>

            {q.type === 'RATING' && (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setResponse(q.id, String(n))}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                      responses[q.id] === String(n)
                        ? 'bg-[#D4A843] text-[#07091A] scale-110'
                        : 'bg-[#0F1120] text-[#8B93A8] border border-[rgba(255,255,255,0.1)] hover:border-[#D4A843]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'TEXT' && (
              <textarea
                value={responses[q.id] || ''}
                onChange={(e) => setResponse(q.id, e.target.value)}
                rows={3}
                placeholder={t('textAnswer')}
                className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843] resize-none"
              />
            )}

            {q.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {(Array.isArray(q.options) ? q.options : []).map((opt: string) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setResponse(q.id, opt)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      responses[q.id] === opt
                        ? 'bg-[#D4A843] text-[#07091A] font-medium'
                        : 'bg-[#0F1120] text-[#8B93A8] border border-[rgba(255,255,255,0.1)] hover:border-[#D4A843]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {error && <p className="text-xs text-[#EF4444] text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </form>
    </div>
  )
}
