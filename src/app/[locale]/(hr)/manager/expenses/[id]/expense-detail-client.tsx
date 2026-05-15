'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { reviewExpense } from '@/lib/actions/expense'
import { ArrowLeft, Receipt, Check, X } from 'lucide-react'

type ExpenseData = {
  id: string
  title: string
  amount: number
  category: string
  description: string | null
  status: string
  createdAt: string
  rejectionReason: string | null
  reviewedAt: string | null
  employee: { firstName: string; lastName: string; department: string }
  reviewedBy: { email: string } | null
}

const statusColors: Record<string, string> = {
  PENDING: 'text-[#D4A843] bg-[rgba(212,168,67,0.12)]',
  APPROVED: 'text-[#22A854] bg-[rgba(34,168,84,0.12)]',
  REJECTED: 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]',
}

export default function ExpenseDetailClient({ expense, locale }: { expense: ExpenseData; locale: string }) {
  const t = useTranslations('expenses')
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function handleApprove() {
    setActionLoading(true)
    await reviewExpense(expense.id, 'APPROVED')
    setActionLoading(false)
    router.refresh()
  }

  async function handleReject() {
    setActionLoading(true)
    await reviewExpense(expense.id, 'REJECTED', rejectReason || undefined)
    setActionLoading(false)
    setShowRejectReason(false)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link href={`/${locale}/manager/expenses`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />{t('back')}
      </Link>

      <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(212,168,67,0.12)] flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#D4A843]" />
            </div>
            <div>
              <h1 className="text-lg font-syne font-bold text-[#E0E6F4]">{expense.title}</h1>
              <p className="text-sm text-[#8B93A8]">{expense.employee.firstName} {expense.employee.lastName} · {expense.employee.department}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[expense.status] || ''}`}>
            {t(expense.status.toLowerCase())}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#0F1120] rounded-lg p-3">
            <span className="text-[10px] text-[#8B93A8] uppercase">{t('amount')}</span>
            <p className="text-lg font-bold text-[#E0E6F4] mt-0.5">{expense.amount.toFixed(2)} AED</p>
          </div>
          <div className="bg-[#0F1120] rounded-lg p-3">
            <span className="text-[10px] text-[#8B93A8] uppercase">{t('category')}</span>
            <p className="text-sm text-[#E0E6F4] mt-0.5">{t(`cat.${expense.category}`)}</p>
          </div>
          <div className="bg-[#0F1120] rounded-lg p-3">
            <span className="text-[10px] text-[#8B93A8] uppercase">{t('submittedOn')}</span>
            <p className="text-sm text-[#E0E6F4] mt-0.5">{new Date(expense.createdAt).toLocaleDateString()}</p>
          </div>
          {expense.reviewedAt && (
            <div className="bg-[#0F1120] rounded-lg p-3">
              <span className="text-[10px] text-[#8B93A8] uppercase">{t('reviewedOn')}</span>
              <p className="text-sm text-[#E0E6F4] mt-0.5">{new Date(expense.reviewedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {expense.description && (
          <div className="bg-[#0F1120] rounded-lg p-3 mb-4">
            <span className="text-[10px] text-[#8B93A8] uppercase">{t('description')}</span>
            <p className="text-sm text-[#E0E6F4] mt-0.5">{expense.description}</p>
          </div>
        )}

        {expense.rejectionReason && (
          <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg p-3">
            <span className="text-[10px] text-[#EF4444] uppercase">{t('rejectionReason')}</span>
            <p className="text-sm text-[#EF4444] mt-0.5">{expense.rejectionReason}</p>
          </div>
        )}
      </div>

      {expense.status === 'PENDING' && (
        <div className="space-y-3">
          {showRejectReason ? (
            <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4 space-y-3">
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} placeholder={t('rejectionReasonPlaceholder')} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843] resize-none" />
              <div className="flex gap-2">
                <button onClick={handleReject} disabled={actionLoading}
                  className="flex-1 py-2 bg-[#EF4444] text-white rounded-lg text-sm font-medium hover:bg-[#DC2626] transition-colors disabled:opacity-50"
                >{actionLoading ? '...' : t('confirmReject')}</button>
                <button onClick={() => setShowRejectReason(false)} className="px-4 py-2 text-sm text-[#8B93A8] hover:text-[#E0E6F4]">{t('cancel')}</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[rgba(34,168,84,0.15)] text-[#22A854] rounded-lg text-sm font-medium hover:bg-[rgba(34,168,84,0.25)] transition-colors disabled:opacity-50"
              ><Check className="w-4 h-4" />{t('approve')}</button>
              <button onClick={() => setShowRejectReason(true)} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[rgba(239,68,68,0.15)] text-[#EF4444] rounded-lg text-sm font-medium hover:bg-[rgba(239,68,68,0.25)] transition-colors disabled:opacity-50"
              ><X className="w-4 h-4" />{t('reject')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
