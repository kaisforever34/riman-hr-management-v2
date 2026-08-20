'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createAsset, assignAsset } from '@/lib/actions/asset'
import { ArrowLeft, Package } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = ['SEWING_MACHINE', 'MANNEQUIN', 'COMPUTER', 'PHONE', 'TOOL', 'FURNITURE', 'VEHICLE', 'UNIFORM', 'OTHER']

type Employee = { id: string; firstName: string; lastName: string }

export default function NewAssetClient({ employees, locale }: { employees: Employee[]; locale: string }) {
  const t = useTranslations('assets')
  const router = useRouter()
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [serialNumber, setSerialNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [notes, setNotes] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await createAsset({
      name: name.trim(),
      category,
      serialNumber: serialNumber.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      notes: notes.trim() || undefined,
    })
    if (result.error) { setLoading(false); return }

    if (assignTo) {
      await assignAsset(result.id!, assignTo)
    }

    router.push(`/${locale}/manager/assets/${result.id}`)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href={`/${locale}/manager/assets`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />{t('back')}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[rgba(212,168,67,0.12)] flex items-center justify-center">
          <Package className="w-5 h-5 text-[#D4A843]" />
        </div>
        <div>
          <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('newAsset')}</h1>
          <p className="text-sm text-[#8B93A8]">{t('newAssetDesc')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('category')}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]">
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('serialNumber')}</label>
            <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('purchaseDate')}</label>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('purchasePrice')}</label>
            <input type="number" step="0.01" min="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('notes')}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843] resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8B93A8] mb-1">{t('assignImmediately')}</label>
          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]">
            <option value="">{t('dontAssign')}</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
          </select>
        </div>

        <button type="submit" disabled={loading || !name}
          className="w-full py-2.5 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50"
        >{loading ? t('saving') : t('save')}</button>
      </form>
    </div>
  )
}
