'use client'

import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type SurveyData = {
  id: string
  title: string
  description: string | null
  isAnonymous: boolean
  dueDate: string | null
  createdAt: string
  questions: {
    id: string
    type: string
    question: string
    options: unknown
    order: number
    responses: { id: string; value: unknown; assignment: { employee: { firstName: string; lastName: string } } | null }[]
  }[]
  assignments: { id: string; status: string; completedAt: string | null; employee: { firstName: string; lastName: string; department: string } }[]
}

export default function SurveyResultsClient({ survey, locale }: { survey: SurveyData; locale: string }) {
  const t = useTranslations('surveys')
  const completed = survey.assignments.filter((a) => a.status === 'COMPLETED').length

  function avgRating(responses: { value: unknown }[]): string {
    const nums = responses.map((r) => Number(r.value)).filter((n) => !isNaN(n))
    return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : '-'
  }

  return (
    <div className="p-6 max-w-4xl">
      <Link href={`/${locale}/manager/surveys`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />{t('back')}
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{survey.title}</h1>
        {survey.description && <p className="text-sm text-[#8B93A8] mt-1">{survey.description}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-[#8B93A8]">
          <span>{completed}/{survey.assignments.length} {t('responses')}</span>
          {survey.isAnonymous && <span className="px-2 py-0.5 bg-[#D4A843] text-[#07091A] rounded-full font-medium">{t('anonymous')}</span>}
        </div>
      </div>

      <div className="grid gap-4">
        {survey.questions.map((q) => (
          <div key={q.id} className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs text-[#D4A843] font-medium uppercase">{q.type}</span>
                <h3 className="text-sm font-medium text-[#E0E6F4] mt-0.5">{q.question}</h3>
              </div>
              {q.type === 'RATING' && <span className="text-lg font-bold text-[#D4A843]">{avgRating(q.responses)}</span>}
            </div>

            {q.responses.length === 0 && <p className="text-xs text-[#8B93A8]">{t('noResponses')}</p>}

            {q.type === 'TEXT' && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {q.responses.map((r) => (
                  <div key={r.id} className="p-2 bg-[#0F1120] rounded-lg border border-[rgba(255,255,255,0.04)]">
                    <p className="text-xs text-[#E0E6F4]">{String(r.value)}</p>
                    {!survey.isAnonymous && r.assignment && (
                      <p className="text-[10px] text-[#5A6278] mt-1">{r.assignment.employee.firstName} {r.assignment.employee.lastName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {q.type === 'RATING' && q.responses.length > 0 && (
              <div className="flex items-end gap-1 h-24">
                {[1,2,3,4,5].map((n) => {
                  const count = q.responses.filter((r) => Number(r.value) === n).length
                  const maxCount = Math.max(...[1,2,3,4,5].map((x) => q.responses.filter((r) => Number(r.value) === x).length))
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                  return (
                    <div key={n} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#0F1120] rounded-t-sm overflow-hidden" style={{ height: '80px' }}>
                        <div className="bg-[#D4A843] transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                      </div>
                      <span className="text-[10px] text-[#8B93A8]">{n}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {q.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-1">
                {(Array.isArray(q.options) ? q.options : []).map((opt: string) => {
                  const count = q.responses.filter((r) => Array.isArray(r.value) ? r.value.includes(opt) : r.value === opt).length
                  const pct = q.responses.length > 0 ? Math.round((count / q.responses.length) * 100) : 0
                  return (
                    <div key={opt} className="flex items-center gap-2 text-xs">
                      <span className="w-32 truncate text-[#8B93A8]">{opt}</span>
                      <div className="flex-1 h-4 bg-[#0F1120] rounded-sm overflow-hidden">
                        <div className="h-full bg-[#D4A843] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-[#E0E6F4] font-medium">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[#E0E6F4] mb-3">{t('respondents')}</h3>
        <div className="space-y-2">
          {survey.assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs">
              <span className="text-[#E0E6F4]">{a.employee.firstName} {a.employee.lastName}</span>
              <span className={a.status === 'COMPLETED' ? 'text-[#22A854]' : 'text-[#D4A843]'}>{a.status === 'COMPLETED' ? '✓' : t('pending')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
