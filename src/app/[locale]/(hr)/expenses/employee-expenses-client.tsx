'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, Receipt } from 'lucide-react'

type ExpenseItem = {
  id: string
  title: string
  amount: number
  category: string
  description: string | null
  status: string
  createdAt: string
}

const statusColors: Record<string, string> = {
  PENDING: 'text-[#D4A843] bg-[rgba(212,168,67,0.12)]',
  APPROVED: 'text-[#22A854] bg-[rgba(34,168,84,0.12)]',
  REJECTED: 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]',
}

export default function EmployeeExpensesClient({ expenses, locale }: { expenses: ExpenseItem[]; locale: string }) {
  const t = useTranslations('expenses')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('myExpenses')}</h1>
          <p className="text-sm text-[#8B93A8]">{t('myExpensesDesc')}</p>
        </div>
        <Link href={`/${locale}/expenses/new`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors">
          <Plus className="w-4 h-4" />{t('newExpense')}
        </Link>
      </div>

      <div className="space-y-3">
        {expenses.map((e) => (
          <div key={e.id} className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#E0E6F4]">{e.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#8B93A8]">
                  <span>{e.category}</span>
                  <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                  {e.description && <span className="truncate">{e.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-bold text-[#E0E6F4]">{e.amount.toFixed(2)} AED</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[e.status] || ''}`}>
                  {t(e.status.toLowerCase())}
                </span>
              </div>
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="py-12 text-center text-[#8B93A8]">
            <Receipt className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
