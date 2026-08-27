'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { reviewExpense, createExpense, deleteExpense } from '@/lib/actions/expense'
import { expenseCategories } from '@/lib/validations/expense'
import { EmployeePicker } from '@/components/employee-picker'
import { Receipt, Eye, Check, X, Filter, Plus, Trash2 } from 'lucide-react'

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

export default function ExpensesListClient({
  expenses,
  employees,
  employeeId,
  locale,
}: {
  expenses: ExpenseItem[]
  employees: { id: string; firstName: string; lastName: string }[]
  employeeId: string
  locale: string
}) {
  const t = useTranslations('expenses')
  const tc = useTranslations('common')
  const router = useRouter()
  const [filter, setFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newExpense, setNewExpense] = useState({
    employeeId,
    title: '',
    amount: '',
    category: 'MATERIALS',
    description: '',
  })

  useEffect(() => {
    setNewExpense((d) => ({ ...d, employeeId }))
  }, [employeeId])

  const filtered = filter === 'ALL' ? expenses : expenses.filter((e) => e.status === filter)

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    setActionLoading(id)
    await reviewExpense(id, status)
    setActionLoading(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setActionLoading(id)
    const res = await deleteExpense(id)
    setActionLoading(null)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success(t('deleted'))
    router.refresh()
  }

  async function handleCreate() {
    if (!newExpense.employeeId || !newExpense.title || !newExpense.amount) return
    setCreating(true)
    const res = await createExpense({
      employeeId: newExpense.employeeId,
      title: newExpense.title,
      amount: newExpense.amount,
      category: newExpense.category,
      description: newExpense.description || undefined,
    })
    setCreating(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success(t('created'))
    setShowCreate(false)
    setNewExpense({ employeeId, title: '', amount: '', category: 'MATERIALS', description: '' })
    router.refresh()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <EmployeePicker employees={employees} employeeId={employeeId} label={t('selectEmployee')} />
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#22A854] text-white hover:bg-[#1d9048] transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('createExpense')}
          </button>
          <Filter className="w-4 h-4 text-[#8B93A8]" />
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-[#D4A843] text-[#07091A]' : 'bg-[#0F1120] text-[#8B93A8] border border-[rgba(255,255,255,0.1)] hover:border-[#D4A843]'}`}
            >{t(s.toLowerCase())}</button>
          ))}
        </div>
      </div>

      {showCreate && (
        <div className="mb-6 bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[#8B93A8]">{t('employee')}</label>
              <select
                className="w-full rounded border bg-[#0F1120] px-3 py-2 text-sm text-[#E0E6F4]"
                value={newExpense.employeeId}
                onChange={e => setNewExpense(d => ({ ...d, employeeId: e.target.value }))}
              >
                <option value="">{t('selectEmployee')}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8B93A8]">{t('categoryLabel')}</label>
              <select
                className="w-full rounded border bg-[#0F1120] px-3 py-2 text-sm text-[#E0E6F4]"
                value={newExpense.category}
                onChange={e => setNewExpense(d => ({ ...d, category: e.target.value }))}
              >
                {expenseCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8B93A8]">{t('titleLabel')}</label>
              <input
                className="w-full rounded border bg-[#0F1120] px-3 py-2 text-sm text-[#E0E6F4]"
                value={newExpense.title}
                onChange={e => setNewExpense(d => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-[#8B93A8]">{t('amountLabel')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded border bg-[#0F1120] px-3 py-2 text-sm text-[#E0E6F4]"
                value={newExpense.amount}
                onChange={e => setNewExpense(d => ({ ...d, amount: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8B93A8]">{t('descriptionLabel')}</label>
            <textarea
              rows={2}
              className="w-full rounded border bg-[#0F1120] px-3 py-2 text-sm text-[#E0E6F4]"
              value={newExpense.description}
              onChange={e => setNewExpense(d => ({ ...d, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newExpense.employeeId || !newExpense.title || !newExpense.amount}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#22A854] text-white hover:bg-[#1d9048] transition-colors disabled:opacity-50"
            >
              {creating ? tc('loading') : tc('save')}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[#0F1120] text-[#8B93A8] border border-[rgba(255,255,255,0.1)]"
            >
              {tc('cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((e) => (
          <div key={e.id} className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
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
                <button onClick={() => handleDelete(e.id)} disabled={actionLoading === e.id}
                  className="p-1.5 text-[#8B93A8] hover:text-[#EF4444] transition-colors disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
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
