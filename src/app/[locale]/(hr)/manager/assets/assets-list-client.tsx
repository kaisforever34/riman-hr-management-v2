'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, Package, Eye } from 'lucide-react'

type AssignmentInfo = {
  id: string
  returnedAt: string | null
  employee: { firstName: string; lastName: string }
}

type AssetItem = {
  id: string
  name: string
  category: string
  serialNumber: string | null
  status: string
  purchaseDate: string | null
  purchasePrice: number | null
  notes: string | null
  assignments: AssignmentInfo[]
  _count: { assignments: number }
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'text-[#22A854] bg-[rgba(34,168,84,0.12)]',
  ASSIGNED: 'text-[#D4A843] bg-[rgba(212,168,67,0.12)]',
  DAMAGED: 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]',
  RETIRED: 'text-[#8B93A8] bg-[rgba(139,147,168,0.12)]',
}

export default function AssetsListClient({ assets, locale }: { assets: AssetItem[]; locale: string }) {
  const t = useTranslations('assets')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('title')}</h1>
        <Link href={`/${locale}/manager/assets/new`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-sm font-medium hover:bg-[#C49A3A] transition-colors">
          <Plus className="w-4 h-4" />{t('newAsset')}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {assets.map((a) => {
          const assignedTo = a.assignments[0]?.employee
          return (
            <div key={a.id} className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(212,168,67,0.12)] flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#D4A843]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#E0E6F4]">{a.name}</h3>
                    <p className="text-xs text-[#8B93A8]">{a.category}{a.serialNumber ? ` · ${a.serialNumber}` : ''}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[a.status] || ''}`}>
                  {t(a.status.toLowerCase())}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#8B93A8] mb-3">
                {assignedTo && <span>{t('assignedTo')} {assignedTo.firstName} {assignedTo.lastName}</span>}
                <span>{a._count.assignments} {t('assignments')}</span>
                {a.purchasePrice && <span>{a.purchasePrice.toFixed(0)} AED</span>}
              </div>

              <Link href={`/${locale}/manager/assets/${a.id}`} className="inline-flex items-center gap-1 text-xs text-[#D4A843] hover:text-[#EFC254]">
                <Eye className="w-3 h-3" />{t('view')}
              </Link>
            </div>
          )
        })}
        {assets.length === 0 && (
          <div className="col-span-2 py-12 text-center text-[#8B93A8]">
            <Package className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
