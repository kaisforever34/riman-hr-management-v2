'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updatePayslip } from '@/lib/actions/payroll'
import { Pencil } from 'lucide-react'

export function PayslipEditForm({
  payslipId,
  bonusPay,
  overtimePay,
}: {
  payslipId: string
  bonusPay: number
  overtimePay: number
}) {
  const t = useTranslations('managerPayroll')
  const tc = useTranslations('common')
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bonus, setBonus] = useState(String(bonusPay))
  const [overtime, setOvertime] = useState(String(overtimePay))

  async function handleSave() {
    setSaving(true)
    const fd = new FormData()
    fd.set('payslipId', payslipId)
    fd.set('bonusPay', bonus)
    fd.set('overtimePay', overtime)
    const result = await updatePayslip(fd)
    setSaving(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(t('payslipUpdated'))
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="me-2 h-3.5 w-3.5" />
        {t('editPayslip')}
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-[#0D1028] p-4 space-y-3">
      <h3 className="text-sm font-semibold">{t('editPayslip')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-[#8B93A8]">{t('bonusPay')}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded border bg-[#0F1120] px-3 py-2 text-sm"
            value={bonus}
            onChange={e => setBonus(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[#8B93A8]">{t('overtimePay')}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded border bg-[#0F1120] px-3 py-2 text-sm"
            value={overtime}
            onChange={e => setOvertime(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? tc('loading') : tc('save')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
          {tc('cancel')}
        </Button>
      </div>
    </div>
  )
}
