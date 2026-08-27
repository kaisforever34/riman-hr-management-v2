'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, Eye, ClipboardList } from 'lucide-react'
import { EmployeePicker } from '@/components/employee-picker'

type SurveyItem = {
  id: string
  title: string
  description: string | null
  isAnonymous: boolean
  isActive: boolean
  dueDate: string | null
  createdAt: string
  createdBy: { email: string }
  _count: { assignments: number; questions: number }
  assignments: { status: string; employeeId: string }[]
}

export default function SurveysListClient({ surveys, locale, employees, employeeId }: { surveys: SurveyItem[]; locale: string; employees: { id: string; firstName: string; lastName: string }[]; employeeId: string }) {
  const t = useTranslations('surveys')
  const visibleSurveys = employeeId ? surveys.filter((s) => s.assignments.some((a) => a.employeeId === employeeId)) : surveys

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <EmployeePicker employees={employees} employeeId={employeeId} label={t('selectEmployee')} />
          <Link href={`/${locale}/manager/surveys/new`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors">
            <Plus className="w-4 h-4" />{t('newSurvey')}
          </Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visibleSurveys.map((s) => {
          const completed = s.assignments.filter((a) => a.status === 'COMPLETED').length
          const total = s.assignments.length
          return (
            <div key={s.id} className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#E0E6F4]">{s.title}</h3>
                  {s.description && <p className="text-xs text-[#8B93A8] mt-1">{s.description}</p>}
                </div>
                {s.isAnonymous && <span className="text-[10px] px-2 py-0.5 bg-[#D4A843] text-[#07091A] rounded-full font-medium">{t('anonymous')}</span>}
              </div>
              <div className="flex items-center gap-4 text-xs text-[#8B93A8] mb-3">
                <span>{s._count.questions} {t('questions')}</span>
                <span>{completed}/{total} {t('responses')}</span>
                {s.dueDate && <span>{t('due')} {new Date(s.dueDate).toLocaleDateString()}</span>}
              </div>
              <Link href={`/${locale}/manager/surveys/${s.id}`} className="inline-flex items-center gap-1 text-xs text-[#D4A843] hover:text-[#EFC254]">
                <Eye className="w-3 h-3" />{t('viewResults')}
              </Link>
            </div>
          )
        })}
        {visibleSurveys.length === 0 && (
          <div className="col-span-2 py-12 text-center text-[#8B93A8]">
            <ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
