'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { UserCheck } from 'lucide-react'
import { reactivateEmployee } from '@/lib/actions/employee'

export function ReactivateButton({ userId }: { userId: string }) {
  const t = useTranslations('employees')
  const [error, formAction, pending] = useActionState<
    { error: string } | undefined,
    FormData
  >(async (_prev, formData) => await reactivateEmployee(formData), undefined)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(t('reactivateConfirm'))) e.preventDefault()
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <UserCheck className="me-1 h-3.5 w-3.5" />
        {t('reactivate')}
      </Button>
      {error ? (
        <p className="mt-1 max-w-[220px] text-xs text-red-600">
          {t('reactivateFailed')}
        </p>
      ) : null}
    </form>
  )
}
