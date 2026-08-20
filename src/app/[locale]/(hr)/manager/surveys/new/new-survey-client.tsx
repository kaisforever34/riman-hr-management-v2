'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createSurvey } from '@/lib/actions/survey'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Employee = { id: string; firstName: string; lastName: string }
type Question = { type: string; question: string; options: string; order: number }

export default function NewSurveyClient({ employees, locale }: { employees: Employee[]; locale: string }) {
  const t = useTranslations('surveys')
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [questions, setQuestions] = useState<Question[]>([{ type: 'RATING', question: '', options: '', order: 0 }])
  const [loading, setLoading] = useState(false)

  function addQuestion() { setQuestions([...questions, { type: 'RATING', question: '', options: '', order: questions.length }]) }
  function removeQuestion(i: number) { setQuestions(questions.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, order: idx }))) }
  function updateQuestion(i: number, field: keyof Question, value: string) {
    const copy = [...questions]; copy[i] = { ...copy[i], [field]: value }; setQuestions(copy)
  }
  function toggleEmployee(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const qs = questions.filter((q) => q.question.trim()).map((q) => ({
      type: q.type, question: q.question, options: q.type === 'MULTIPLE_CHOICE' ? q.options.split(',').map((s) => s.trim()).filter(Boolean) : undefined, order: q.order,
    }))
    const result = await createSurvey(title, description || null, isAnonymous, dueDate || null, selectedIds, qs)
    if (result.error) { setLoading(false); return }
    router.push(`/${locale}/manager/surveys/${result.id}`)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/${locale}/manager/surveys`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />{t('back')}
      </Link>
      <h1 className="text-xl font-syne font-bold text-[#E0E6F4] mb-6">{t('createSurvey')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#0D1028] rounded-xl p-4 border border-[rgba(255,255,255,0.065)] space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('title')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('description')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843] resize-none" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-[#8B93A8]">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-[#D4A843]" />
              {t('anonymousLabel')}
            </label>
            <div>
              <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('dueDate')}</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]" />
            </div>
          </div>
        </div>

        <div className="bg-[#0D1028] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#E0E6F4]">{t('questions')}</h3>
            <button type="button" onClick={addQuestion} className="flex items-center gap-1 text-xs text-[#D4A843]"><Plus className="w-3 h-3" />{t('addQuestion')}</button>
          </div>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-[#0F1120] rounded-lg border border-[rgba(255,255,255,0.04)]">
                <div className="flex-1 space-y-2">
                  <input value={q.question} onChange={(e) => updateQuestion(i, 'question', e.target.value)} placeholder={t('questionPlaceholder')} className="w-full px-2 py-1.5 bg-[#0D1028] border border-[rgba(255,255,255,0.1)] rounded text-[#E0E6F4] text-xs focus:outline-none focus:border-[#D4A843]" />
                  <div className="flex gap-2">
                    <select value={q.type} onChange={(e) => updateQuestion(i, 'type', e.target.value)} className="px-2 py-1 bg-[#0D1028] border border-[rgba(255,255,255,0.1)] rounded text-[#E0E6F4] text-xs focus:outline-none focus:border-[#D4A843]">
                      <option value="RATING">Rating (1-5)</option>
                      <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                      <option value="TEXT">Text</option>
                    </select>
                    {q.type === 'MULTIPLE_CHOICE' && (
                      <input value={q.options} onChange={(e) => updateQuestion(i, 'options', e.target.value)} placeholder="Option1, Option2" className="flex-1 px-2 py-1 bg-[#0D1028] border border-[rgba(255,255,255,0.1)] rounded text-[#E0E6F4] text-xs focus:outline-none focus:border-[#D4A843]" />
                    )}
                  </div>
                </div>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(i)} className="p-1 text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] rounded"><Trash2 className="w-3 h-3" /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0D1028] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
          <h3 className="text-sm font-semibold text-[#E0E6F4] mb-3">{t('assignTo')}</h3>
          <div className="flex flex-wrap gap-2">
            {employees.map((emp) => (
              <button key={emp.id} type="button" onClick={() => toggleEmployee(emp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedIds.includes(emp.id) ? 'bg-[#D4A843] text-[#07091A] border-[#D4A843]' : 'bg-[#0F1120] text-[#8B93A8] border-[rgba(255,255,255,0.1)] hover:border-[#D4A843]'}`}
              >{emp.firstName} {emp.lastName}</button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || !title || selectedIds.length === 0}
          className="w-full py-2.5 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50"
        >{loading ? t('creating') : t('publish')}</button>
      </form>
    </div>
  )
}
