'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { startOnboarding } from '@/lib/actions/onboarding'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string; department: string; employeeCode: string }

export default function NewOnboardingClient({ employees, locale }: { employees: Employee[]; locale: string }) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setLoading(true)
    setError('')
    const result = await startOnboarding(selectedId, 'ONBOARDING')
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/${locale}/manager/onboarding/${result.id}`)
      router.refresh()
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <Link href={`/${locale}/manager/onboarding`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </Link>

      <h1 className="text-xl font-syne font-bold text-[#E0E6F4] mb-6">{t('startOnboarding')}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-2">{t('selectEmployee')}</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 bg-[#0D0F1A] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]"
          >
            <option value="">{t('chooseEmployee')}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} — {emp.jobTitle} ({emp.department})
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-[#EF4444] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !selectedId}
          className="w-full px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50"
        >
          {loading ? t('starting') : t('launchOnboarding')}
        </button>
      </form>
    </div>
  )
}
