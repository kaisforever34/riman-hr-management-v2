'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function HrError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorPage')
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
      <AlertTriangle className="h-12 w-12 text-audit-red" />
      <h2 className="text-xl font-semibold">{t('title')}</h2>
      <p className="max-w-md text-center text-sm text-ledger-text-secondary">
        {t('description')}
      </p>
      <Button onClick={reset}>{t('retry')}</Button>
    </div>
  )
}
