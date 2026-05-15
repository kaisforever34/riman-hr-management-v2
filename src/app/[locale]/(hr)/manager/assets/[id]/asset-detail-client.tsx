'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { assignAsset, returnAsset, updateAsset } from '@/lib/actions/asset'
import { ArrowLeft, Package, ArrowRight, Undo2 } from 'lucide-react'

type EmployeeInfo = { id: string; firstName: string; lastName: string }
type AssignmentInfo = {
  id: string
  assignedAt: string
  returnedAt: string | null
  note: string | null
  employee: EmployeeInfo
}

type AssetData = {
  id: string
  name: string
  category: string
  serialNumber: string | null
  purchaseDate: string | null
  purchasePrice: number | null
  status: string
  notes: string | null
  assignments: AssignmentInfo[]
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'text-[#22A854] bg-[rgba(34,168,84,0.12)]',
  ASSIGNED: 'text-[#D4A843] bg-[rgba(212,168,67,0.12)]',
  DAMAGED: 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]',
  RETIRED: 'text-[#8B93A8] bg-[rgba(139,147,168,0.12)]',
}

const STATUS_OPTIONS = ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'RETIRED']

export default function AssetDetailClient({ asset, employees, locale }: { asset: AssetData; employees: EmployeeInfo[]; locale: string }) {
  const t = useTranslations('assets')
  const router = useRouter()
  const [assignTo, setAssignTo] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(asset.status)

  const activeAssignment = asset.assignments.find((a) => !a.returnedAt)

  async function handleAssign() {
    if (!assignTo) return
    setAssigning(true)
    await assignAsset(asset.id, assignTo, assignNote || undefined)
    setAssigning(false)
    setAssignTo('')
    setAssignNote('')
    router.refresh()
  }

  async function handleReturn(assignmentId: string) {
    await returnAsset(assignmentId, asset.id)
    router.refresh()
  }

  async function handleStatusUpdate() {
    await updateAsset(asset.id, { status: newStatus })
    setEditingStatus(false)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/${locale}/manager/assets`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />{t('back')}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(212,168,67,0.12)] flex items-center justify-center">
            <Package className="w-5 h-5 text-[#D4A843]" />
          </div>
          <div>
            <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{asset.name}</h1>
            <p className="text-sm text-[#8B93A8]">{asset.category}{asset.serialNumber ? ` · ${asset.serialNumber}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[asset.status] || ''}`}>
            {t(asset.status.toLowerCase())}
          </span>
          <button onClick={() => { setNewStatus(asset.status); setEditingStatus(true) }} className="text-[10px] text-[#D4A843] hover:text-[#EFC254] underline">{t('changeStatus')}</button>
        </div>
      </div>

      {editingStatus && (
        <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4 mb-4 flex items-center gap-3">
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="px-3 py-1.5 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
          </select>
          <button onClick={handleStatusUpdate} className="px-3 py-1.5 bg-[#D4A843] text-[#07091A] rounded-lg text-xs font-medium">{t('save')}</button>
          <button onClick={() => setEditingStatus(false)} className="text-xs text-[#8B93A8]">{t('cancel')}</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        {asset.purchaseDate && (
          <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-3">
            <span className="text-[10px] text-[#8B93A8] uppercase">{t('purchaseDate')}</span>
            <p className="text-sm text-[#E0E6F4] mt-0.5">{new Date(asset.purchaseDate).toLocaleDateString()}</p>
          </div>
        )}
        {asset.purchasePrice !== null && asset.purchasePrice !== undefined && (
          <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-3">
            <span className="text-[10px] text-[#8B93A8] uppercase">{t('purchasePrice')}</span>
            <p className="text-sm text-[#E0E6F4] mt-0.5">{asset.purchasePrice.toFixed(2)} AED</p>
          </div>
        )}
        {asset.notes && (
          <div className="col-span-2 bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-3">
            <span className="text-[10px] text-[#8B93A8] uppercase">{t('notes')}</span>
            <p className="text-sm text-[#E0E6F4] mt-0.5">{asset.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-[#E0E6F4] mb-4">{t('assignToEmployee')}</h3>
        {activeAssignment ? (
          <div className="flex items-center justify-between p-3 bg-[#0F1120] rounded-lg border border-[rgba(255,255,255,0.04)] mb-3">
            <div>
              <p className="text-sm text-[#E0E6F4]">{activeAssignment.employee.firstName} {activeAssignment.employee.lastName}</p>
              <p className="text-xs text-[#8B93A8]">{t('assigned')} {new Date(activeAssignment.assignedAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => handleReturn(activeAssignment.id)} className="flex items-center gap-1 px-3 py-1.5 bg-[rgba(239,68,68,0.12)] text-[#EF4444] rounded-lg text-xs font-medium hover:bg-[rgba(239,68,68,0.2)] transition-colors">
              <Undo2 className="w-3 h-3" />{t('return')}
            </button>
          </div>
        ) : (
          <p className="text-xs text-[#5A6278] mb-3">{t('notAssigned')}</p>
        )}
        <div className="flex gap-2">
          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="flex-1 px-3 py-2 bg-[#0F1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#E0E6F4] text-sm focus:outline-none focus:border-[#D4A843]">
            <option value="">{t('selectEmployee')}</option>
            {employees.filter((e) => !activeAssignment || e.id !== activeAssignment.employee.id).map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
          </select>
          <button onClick={handleAssign} disabled={!assignTo || assigning} className="flex items-center gap-1 px-4 py-2 bg-[#D4A843] text-[#07091A] rounded-lg text-xs font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50">
            <ArrowRight className="w-3 h-3" />{t('assign')}
          </button>
        </div>
      </div>

      <div className="bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[#E0E6F4] mb-3">{t('history')}</h3>
        <div className="space-y-2">
          {asset.assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-2.5 bg-[#0F1120] rounded-lg border border-[rgba(255,255,255,0.04)]">
              <div>
                <p className="text-xs text-[#E0E6F4]">{a.employee.firstName} {a.employee.lastName}</p>
                <p className="text-[10px] text-[#8B93A8]">
                  {new Date(a.assignedAt).toLocaleDateString()} {a.returnedAt ? `→ ${new Date(a.returnedAt).toLocaleDateString()}` : `→ ${t('current')}`}
                </p>
              </div>
              {a.note && <span className="text-[10px] text-[#5A6278]">{a.note}</span>}
            </div>
          ))}
          {asset.assignments.length === 0 && <p className="text-xs text-[#5A6278] text-center py-4">{t('noHistory')}</p>}
        </div>
      </div>
    </div>
  )
}
