'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ClipboardList, CheckCircle, Clock } from 'lucide-react'

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

export default function EmployeeSurveysClient({ assignments, locale }: { assignments: AssignmentItem[]; locale: string }) {
  const t = useTranslations('surveys')
  const tNav = useTranslations('nav')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{tNav('mySurveys')}</h1>
        <p className="text-sm text-[#8B93A8]">{t('mySurveysDesc')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {assignments.map((a) => {
          const isCompleted = a.status === 'COMPLETED'
          return (
            <div key={a.id} className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#E0E6F4] truncate">{a.survey.title}</h3>
                  {a.survey.description && <p className="text-xs text-[#8B93A8] mt-1 line-clamp-2">{a.survey.description}</p>}
                </div>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-[#22A854] flex-shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-[#D4A843] flex-shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-[#8B93A8] mb-3">
                <span>{a.survey.questions.length} {t('questions')}</span>
                <span className={isCompleted ? 'text-[#22A854]' : 'text-[#D4A843]'}>
                  {isCompleted ? t('completed') : t('pending')}
                </span>
                {a.survey.dueDate && <span>{t('due')} {new Date(a.survey.dueDate).toLocaleDateString()}</span>}
              </div>

              <div className="flex items-center justify-between">
                {a.completedAt && (
                  <span className="text-[10px] text-[#5A6278]">{t('completedOn')} {new Date(a.completedAt).toLocaleDateString()}</span>
                )}
                <Link
                  href={`/${locale}/surveys/${a.id}`}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isCompleted
                      ? 'text-[#8B93A8] bg-[#0F1120] border border-[rgba(255,255,255,0.1)] hover:text-[#E0E6F4]'
                      : 'text-[#07091A] bg-[#D4A843] hover:bg-[#C49A3A]'
                  }`}
                >
                  {isCompleted ? t('viewSurvey') : t('startSurvey')}
                </Link>
              </div>
            </div>
          )
        })}
        {assignments.length === 0 && (
          <div className="col-span-2 py-12 text-center text-[#8B93A8]">
            <ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
