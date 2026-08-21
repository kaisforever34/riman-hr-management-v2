'use client'

import { useTranslations } from 'next-intl'
import { Package, CalendarDays, Hash } from 'lucide-react'

type AssetItem = {
  id: string
  assignedAt: string
  asset: {
    id: string
    name: string
    category: string
    serialNumber: string | null
    purchaseDate: string | null
    notes: string | null
  }
}

export default function EmployeeAssetsClient({ assignments }: { assignments: AssetItem[] }) {
  const t = useTranslations('assets')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-syne font-bold tracking-tight text-[#E0E6F4]">{t('myAssets')}</h1>
        <p className="text-[13px] text-[#8B93A8]">{t('myAssetsDesc')}</p>
      </div>

      <div className="space-y-3">
        {assignments.map((a) => (
          <div key={a.id} className="bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-[#E0E6F4]">{a.asset.name}</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-[#8B93A8]">
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" />{a.asset.category}</span>
                  {a.asset.serialNumber && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{a.asset.serialNumber}</span>}
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{t('assigned')} {new Date(a.assignedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-[rgba(212,168,67,0.15)] text-[#D4A843] rounded-full text-[10px] font-medium">Assigned</span>
            </div>
            {a.asset.notes && <p className="text-[12px] text-[#5A6278] mt-2">{a.asset.notes}</p>}
          </div>
        ))}
        {assignments.length === 0 && (
          <div className="py-12 text-center text-[#8B93A8]">
            <Package className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-[13px]">{t('empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
