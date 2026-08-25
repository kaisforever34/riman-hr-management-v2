'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Key } from 'lucide-react'
import { resetPassword } from '@/lib/actions/employee'

export function ResetPasswordButton({ userId }: { userId: string }) {
  const t = useTranslations('employees')
  const [state, formAction, pending] = useActionState<
    { error?: string; generatedPassword?: string } | undefined,
    FormData
  >(async (_prev, formData) => await resetPassword(formData), undefined)

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={(e) => {
          if (!confirm(t('resetPasswordConfirm'))) e.preventDefault()
        }}
      >
        <Key className="me-1 h-3 w-3" />
        {t('resetPassword')}
      </Button>
      {state?.error && (
        <p className="mt-1 text-[11px] text-red-500">{state.error}</p>
      )}
      {state?.generatedPassword && (
        <p className="mt-1 text-[11px] text-green-500">
          {t('resetPasswordSuccess')}: <strong>{state.generatedPassword}</strong>
        </p>
      )}
    </form>
  )
}
