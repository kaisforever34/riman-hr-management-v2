'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setAllocation } from '@/lib/actions/leave'
import { Pencil } from 'lucide-react'

interface LeaveTypesClientProps {
  leaveTypes: any[]
  employees: { id: string; firstName: string; lastName: string }[]
  employeeBalances: { employeeId: string; balances: any[] }[]
  locale: string
}

export default function LeaveTypesClient({ leaveTypes, employees, employeeBalances }: LeaveTypesClientProps) {
  const t = useTranslations('leaveTypes')
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [allocationValue, setAllocationValue] = useState('')
  const [saving, setSaving] = useState(false)

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="overflow-x-auto rounded-lg border bg-[#0D1028]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
              <th className="p-3 font-medium">{t('employee')}</th>
              {leaveTypes.map((lt: any) => (
                <th key={lt.id} className="p-3 font-medium text-center">{lt.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                <td className="p-3 font-medium">{emp.firstName} {emp.lastName}</td>
                {leaveTypes.map((lt: any) => {
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
  )
}
