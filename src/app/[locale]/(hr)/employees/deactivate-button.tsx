'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { UserX } from 'lucide-react'
import { deactivateEmployee } from '@/lib/actions/employee'

export function DeactivateButton({ userId }: { userId: string }) {
  const t = useTranslations('employees')

  return (
    <form
      action={async (formData: FormData) => {
        await deactivateEmployee(formData)
      }}
      onSubmit={(e) => {
        if (!confirm(t('deactivateConfirm'))) e.preventDefault()
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="outline" size="sm">
        <UserX className="me-1 h-3.5 w-3.5" />
        {t('deactivate')}
      </Button>
    </form>
  )
}
