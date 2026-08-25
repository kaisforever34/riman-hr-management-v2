'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { UserX } from 'lucide-react'
import { deactivateEmployee } from '@/lib/actions/employee'

export function DeactivateButton({ userId }: { userId: string }) {
  const t = useTranslations('employees')
  const [error, formAction, pending] = useActionState<
    { error: string } | undefined,
    FormData
  >(async (_prev, formData) => await deactivateEmployee(formData), undefined)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(t('deactivateConfirm'))) e.preventDefault()
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <UserX className="me-1 h-3.5 w-3.5" />
        {t('deactivate')}
      </Button>
      {error ? (
        <p className="mt-1 max-w-[220px] text-xs text-red-600">
          {t('deactivateFailed')}
        </p>
      ) : null}
    </form>
  )
}
