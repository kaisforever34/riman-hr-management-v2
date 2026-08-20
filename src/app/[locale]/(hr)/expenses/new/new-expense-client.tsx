'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createExpense } from '@/lib/actions/expense'
import { ArrowLeft, Receipt } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = ['MATERIALS', 'TRAVEL', 'MEALS', 'SUPPLIES', 'MAINTENANCE', 'UTILITIES', 'OTHER']

export default function NewExpenseClient({ locale }: { locale: string }) {
  const t = useTranslations('expenses')
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t('invalidAmount'))
      return
    }

    setLoading(true)
    const result = await createExpense({
      title: title.trim(),
      amount: numAmount,
      category,
      description: description.trim() || undefined,
    })
    setLoading(false)

    if (result.error) { setError(result.error); return }

    router.push(`/${locale}/expenses`)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href={`/${locale}/expenses`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />{t('back')}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[rgba(212,168,67,0.12)] flex items-center justify-center">
          <Receipt className="w-5 h-5 text-[#D4A843]" />
        </div>
        <div>
          <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('newExpense')}</h1>
          <p className="text-sm text-[#8B93A8]">{t('newExpenseDesc')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('expenseTitle')}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('amount')}</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('category')}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]">
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('description')}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843] resize-none" />
        </div>

        {error && <p className="text-xs text-[#EF4444]">{error}</p>}

        <button type="submit" disabled={loading || !title || !amount}
          className="w-full py-2.5 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50"
        >{loading ? t('submitting') : t('submit')}</button>
      </form>
    </div>
  )
}
