'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button, buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cancelLeave } from '@/lib/actions/leave'

interface LeaveDetailClientProps {
  request: any
  role: string
  locale: string
}

export default function LeaveDetailClient({ request, role, locale }: LeaveDetailClientProps) {
  const t = useTranslations('leave')
  const tc = useTranslations('common')
  const [cancelling, setCancelling] = useState(false)

  const isManager = role === 'MANAGER'
  const canCancel = request.status === 'PENDING' || (isManager && request.status === 'APPROVED')

  async function handleCancel() {
    setCancelling(true)
    const formData = new FormData()
    formData.append('id', request.id)
    await cancelLeave(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={isManager ? `/${locale}/manager/leaves` : `/${locale}/leave`}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('type')}</p>
            <p className="font-medium">{request.leaveType.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('status')}</p>
            <p className="font-medium">{t(`statuses.${request.status}`)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('startDate')}</p>
            <p className="font-medium">{new Date(request.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('endDate')}</p>
            <p className="font-medium">{new Date(request.endDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('duration')}</p>
            <p className="font-medium">{request.durationDays} {request.durationDays === 1 ? t('day') : t('days')}</p>
          </div>
          {request.isHalfDay && (
            <div>
              <p className="text-sm text-muted-foreground">{t('halfDayPeriod')}</p>
              <p className="font-medium">{t(request.halfDayPeriod)}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{t('reason')}</p>
          <p className="mt-1">{request.reason}</p>
        </div>

        {request.rejectReason && (
          <div>
            <p className="text-sm text-muted-foreground">{t('rejectReason')}</p>
            <p className="mt-1 text-red-600">{request.rejectReason}</p>
          </div>
        )}

        {request.attachmentFile && (
          <div>
            <p className="text-sm text-muted-foreground">{t('attachment')}</p>
            <a href={request.attachmentFile} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              {tc('view')}
            </a>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>{t('submittedOn')}: {new Date(request.createdAt).toLocaleDateString()}</p>
          {request.approvedAt && <p>{t('approvedOn')}: {new Date(request.approvedAt).toLocaleDateString()}</p>}
        </div>

        {canCancel && (
          <form action={handleCancel}>
            <Button variant="outline" type="submit" disabled={cancelling} className="text-red-600">
              {cancelling ? tc('loading') : t('cancelled')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
