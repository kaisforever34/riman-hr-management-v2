'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserX } from 'lucide-react'
import { terminateEmployee } from '@/lib/actions/employee'
import { format } from 'date-fns'

export function TerminateButton({ employeeId }: { employeeId: string }) {
  const t = useTranslations('employeeDetail')
  const tc = useTranslations('common')
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [termDate, setTermDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  async function handleTerminate() {
    if (!confirm(t('terminateConfirm'))) return
    setLoading(true)
    const result = await terminateEmployee(employeeId, termDate)
    setLoading(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(t('terminateSuccess'))
    setShowForm(false)
    router.refresh()
  }

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" className="text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => setShowForm(true)}>
        <UserX className="me-1 h-3.5 w-3.5" />
        {t('terminate')}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="rounded border bg-[#0D1028] px-2 py-1.5 text-sm"
        value={termDate}
        onChange={e => setTermDate(e.target.value)}
      />
      <Button variant="destructive" size="sm" onClick={handleTerminate} disabled={loading || !termDate}>
        {loading ? tc('loading') : t('confirmTerminate')}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={loading}>
        {tc('cancel')}
      </Button>
    </div>
  )
}
