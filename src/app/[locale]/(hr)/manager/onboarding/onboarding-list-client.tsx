'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, Eye } from 'lucide-react'

type OnboardingRecord = {
  id: string
  employee: { firstName: string; lastName: string; jobTitle: string; department: string }
  status: string
  startedAt: string
  completedAt: string | null
  tasks: { status: string }[]
}

export default function OnboardingListClient({ records, type, locale }: { records: OnboardingRecord[]; type: string; locale: string }) {
  const t = useTranslations('onboarding')
  const basePath = `/${locale}/manager/${type.toLowerCase()}`

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{type === 'ONBOARDING' ? t('listTitle') : t('offboardListTitle')}</h1>
        <Link
          href={`${basePath}/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {type === 'ONBOARDING' ? t('newOnboarding') : t('newOffboarding')}
        </Link>
      </div>

      <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.065)]">
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('employee')}</th>
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('department')}</th>
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('progress')}</th>
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('status')}</th>
              <th className="text-left py-3 px-4 text-[#8B93A8] font-medium">{t('started')}</th>
              <th className="text-right py-3 px-4 text-[#8B93A8] font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#8B93A8]">{t('noRecords')}</td>
              </tr>
            )}
            {records.map((r) => {
              const total = r.tasks.length
              const done = r.tasks.filter((t) => t.status === 'COMPLETED').length
              const statusColors: Record<string, string> = {
                IN_PROGRESS: 'bg-[#D4A843] text-[#07091A]',
                COMPLETED: 'bg-[#22A854] text-white',
                PENDING: 'bg-[#8B93A8] text-white',
                CANCELLED: 'bg-[#EF4444] text-white',
              }
              return (
                <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="py-3 px-4 text-[#E0E6F4] font-medium">{r.employee.firstName} {r.employee.lastName}</td>
                  <td className="py-3 px-4 text-[#8B93A8]">{r.employee.department}</td>
                  <td className="py-3 px-4 text-[#E0E6F4]">{done}/{total}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || statusColors.PENDING}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#8B93A8]">{new Date(r.startedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`${basePath}/${r.id}`} className="inline-flex items-center gap-1 text-[#D4A843] hover:text-[#EFC254] text-sm">
                      <Eye className="w-4 h-4" />
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
