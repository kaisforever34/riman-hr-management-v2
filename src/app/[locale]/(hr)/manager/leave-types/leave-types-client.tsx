'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setAllocation, createLeaveType, updateLeaveType, toggleLeaveTypeActive } from '@/lib/actions/leave'
import { Pencil, Plus } from 'lucide-react'

interface LeaveTypesClientProps {
  leaveTypes: any[]
  employees: { id: string; firstName: string; lastName: string }[]
  employeeBalances: { employeeId: string; balances: any[] }[]
  locale: string
}

export default function LeaveTypesClient({ leaveTypes, employees, employeeBalances }: LeaveTypesClientProps) {
  const t = useTranslations('leaveTypes')
  const tc = useTranslations('common')
  const router = useRouter()
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [allocationValue, setAllocationValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [typeForm, setTypeForm] = useState({ name: '', nameAr: '', defaultDays: '0', requiresAttachment: false, isPaid: true, isActive: true })
  const [typeSaving, setTypeSaving] = useState(false)

  function getBalance(employeeId: string, leaveTypeId: string) {
    const eb = employeeBalances.find((b) => b.employeeId === employeeId)
    if (!eb) return null
    return eb.balances.find((b: any) => b.leaveTypeId === leaveTypeId)
  }

  async function handleSave() {
    if (!editingEmployee || !editingType || !allocationValue) return
    setSaving(true)
    const formData = new FormData()
    formData.append('employeeId', editingEmployee)
    formData.append('leaveTypeId', editingType)
    formData.append('allocated', allocationValue)
    await setAllocation(formData)
    setSaving(false)
    setEditingEmployee(null)
    setEditingType(null)
  }

  function openCreateForm() {
    setEditingTypeId(null)
    setTypeForm({ name: '', nameAr: '', defaultDays: '0', requiresAttachment: false, isPaid: true, isActive: true })
    setShowTypeForm(true)
  }

  function openEditForm(lt: any) {
    setEditingTypeId(lt.id)
    setTypeForm({
      name: lt.name,
      nameAr: lt.nameAr || '',
      defaultDays: String(lt.defaultDays),
      requiresAttachment: lt.requiresAttachment,
      isPaid: lt.isPaid,
      isActive: lt.isActive,
    })
    setShowTypeForm(true)
  }

  async function handleSaveType() {
    if (!typeForm.name) return
    setTypeSaving(true)
    const fd = new FormData()
    if (editingTypeId) fd.append('id', editingTypeId)
    fd.append('name', typeForm.name)
    fd.append('nameAr', typeForm.nameAr)
    fd.append('defaultDays', typeForm.defaultDays)
    if (typeForm.requiresAttachment) fd.append('requiresAttachment', 'on')
    if (typeForm.isPaid) fd.append('isPaid', 'on')
    if (typeForm.isActive) fd.append('isActive', 'on')
    const result = editingTypeId ? await updateLeaveType(fd) : await createLeaveType(fd)
    setTypeSaving(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(editingTypeId ? t('typeUpdated') : t('typeCreated'))
    setShowTypeForm(false)
    router.refresh()
  }

  async function handleToggle(lt: any) {
    const result = await toggleLeaveTypeActive(lt.id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={openCreateForm}>
          <Plus className="me-2 h-4 w-4" />
          {t('addLeaveType')}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-[#0D1028]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
              <th className="p-3 font-medium">{t('typeName')}</th>
              <th className="p-3 font-medium text-center">{t('defaultDays')}</th>
              <th className="p-3 font-medium text-center">{t('paid')}</th>
              <th className="p-3 font-medium text-center">{t('attachment')}</th>
              <th className="p-3 font-medium text-center">{t('statusCol')}</th>
              <th className="p-3 font-medium text-center">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {leaveTypes.map((lt: any) => (
              <tr key={lt.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                <td className="p-3 font-medium">{lt.name}{lt.nameAr ? ` / ${lt.nameAr}` : ''}</td>
                <td className="p-3 text-center">{lt.defaultDays}</td>
                <td className="p-3 text-center">{lt.isPaid ? tc('yes') : tc('no')}</td>
                <td className="p-3 text-center">{lt.requiresAttachment ? tc('yes') : tc('no')}</td>
                <td className="p-3 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${lt.isActive ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' : 'bg-[#181E38] text-[#8B93A8]'}`}>
                    {lt.isActive ? t('active') : t('inactive')}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEditForm(lt)} className="text-[#4B8BF0] hover:underline text-xs">{tc('edit')}</button>
                    <button onClick={() => handleToggle(lt)} className="text-[#8B93A8] hover:underline text-xs">
                      {lt.isActive ? t('deactivate') : t('activate')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showTypeForm && (
        <div className="rounded-lg border bg-[#0D1028] p-4 space-y-3">
          <h2 className="text-lg font-semibold">{editingTypeId ? t('editLeaveType') : t('addLeaveType')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[#8B93A8]">{t('typeName')} *</label>
              <Input value={typeForm.name} onChange={e => setTypeForm(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#8B93A8]">{t('typeNameAr')}</label>
              <Input value={typeForm.nameAr} onChange={e => setTypeForm(d => ({ ...d, nameAr: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#8B93A8]">{t('defaultDays')}</label>
              <Input type="number" min="0" value={typeForm.defaultDays} onChange={e => setTypeForm(d => ({ ...d, defaultDays: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={typeForm.isPaid} onChange={e => setTypeForm(d => ({ ...d, isPaid: e.target.checked }))} className="accent-[#22C55E]" />
              {t('paid')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={typeForm.requiresAttachment} onChange={e => setTypeForm(d => ({ ...d, requiresAttachment: e.target.checked }))} className="accent-[#22C55E]" />
              {t('attachment')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={typeForm.isActive} onChange={e => setTypeForm(d => ({ ...d, isActive: e.target.checked }))} className="accent-[#22C55E]" />
              {t('active')}
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveType} disabled={typeSaving || !typeForm.name}>
              {typeSaving ? tc('loading') : tc('save')}
            </Button>
            <Button variant="outline" onClick={() => setShowTypeForm(false)} disabled={typeSaving}>
              {tc('cancel')}
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">{t('allocationsTitle')}</h2>
        <div className="overflow-x-auto rounded-lg border bg-[#0D1028]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
                <th className="p-3 font-medium">{t('employee')}</th>
                {leaveTypes.filter((lt: any) => lt.isActive).map((lt: any) => (
                  <th key={lt.id} className="p-3 font-medium text-center">{lt.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="p-3 font-medium">{emp.firstName} {emp.lastName}</td>
                  {leaveTypes.filter((lt: any) => lt.isActive).map((lt: any) => {
                    const balance = getBalance(emp.id, lt.id)
                    const remaining = balance ? balance.allocated + balance.carriedOver - balance.used : lt.defaultDays
                    const isEditing = editingEmployee === emp.id && editingType === lt.id
                    return (
                      <td key={lt.id} className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              className="h-7 w-16 text-center"
                              value={allocationValue}
                              onChange={(e) => setAllocationValue(e.target.value)}
                            />
                            <Button size="xs" onClick={handleSave} disabled={saving}>
                              {t('save')}
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingEmployee(emp.id)
                              setEditingType(lt.id)
                              setAllocationValue(String(remaining))
                            }}
                            className="inline-flex items-center gap-1 text-sm hover:text-[#4B8BF0]"
                          >
                            {remaining}
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
