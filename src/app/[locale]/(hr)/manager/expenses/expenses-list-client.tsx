'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { reviewExpense } from '@/lib/actions/expense'
import { Receipt, Eye, Check, X, Filter } from 'lucide-react'

type ExpenseItem = {
  id: string
  title: string
  amount: number
  category: string
  description: string | null
  status: string
  createdAt: string
  employee: { firstName: string; lastName: string; department: string }
  reviewedBy: { email: string } | null
}

const statusColors: Record<string, string> = {
  PENDING: 'text-[#D4A843] bg-[rgba(212,168,67,0.12)]',
  APPROVED: 'text-[#22A854] bg-[rgba(34,168,84,0.12)]',
  REJECTED: 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]',
}

export default function ExpensesListClient({ expenses, locale }: { expenses: ExpenseItem[]; locale: string }) {
  const t = useTranslations('expenses')
  const router = useRouter()
  const [filter, setFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filtered = filter === 'ALL' ? expenses : expenses.filter((e) => e.status === filter)

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    setActionLoading(id)
    await reviewExpense(id, status)
    setActionLoading(null)
    router.refresh()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8B93A8]" />
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-[#D4A843] text-[#07091A]' : 'bg-[#0F1120] text-[#8B93A8] border border-[rgba(255,255,255,0.1)] hover:border-[#D4A843]'}`}
            >{t(s.toLowerCase())}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((e) => (
          <div key={e.id} className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#E0E6F4]">{e.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[e.status] || ''}`}>
                    {t(e.status.toLowerCase())}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#8B93A8]">
                  <span>{e.employee.firstName} {e.employee.lastName}</span>
                  <span>{e.employee.department}</span>
                  <span>{e.category}</span>
                  <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-bold text-[#E0E6F4]">{e.amount.toFixed(2)} AED</span>
                {e.status === 'PENDING' && (
                  <div className="flex gap-1">
                    <button onClick={() => handleReview(e.id, 'APPROVED')} disabled={actionLoading === e.id}
                      className="p-1.5 bg-[rgba(34,168,84,0.12)] text-[#22A854] rounded-lg hover:bg-[rgba(34,168,84,0.2)] transition-colors disabled:opacity-50">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleReview(e.id, 'REJECTED')} disabled={actionLoading === e.id}
                      className="p-1.5 bg-[rgba(239,68,68,0.12)] text-[#EF4444] rounded-lg hover:bg-[rgba(239,68,68,0.2)] transition-colors disabled:opacity-50">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <Link href={`/${locale}/manager/expenses/${e.id}`} className="p-1.5 text-[#8B93A8] hover:text-[#E0E6F4] transition-colors">
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[#8B93A8]">
            <Receipt className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
