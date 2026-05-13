'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Check, X } from 'lucide-react'
import Link from 'next/link'
import { approveLeave, rejectLeave, cancelLeave } from '@/lib/actions/leave'

interface ManagerLeaveActionClientProps {
  request: any
  locale: string
}

export default function ManagerLeaveActionClient({ request, locale }: ManagerLeaveActionClientProps) {
  const t = useTranslations('managerLeaves')
  const tl = useTranslations('leave')
  const tc = useTranslations('common')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState('')

  async function handleApprove() {
    setActionLoading('approve')
    setError('')
    const formData = new FormData()
    formData.append('id', request.id)
    const result = await approveLeave(formData)
    if (result?.error) setError(result.error)
    setActionLoading(null)
  }

  async function handleReject() {
    if (!rejectReason) return
    setActionLoading('reject')
    setError('')
    const formData = new FormData()
    formData.append('id', request.id)
    formData.append('rejectReason', rejectReason)
    const result = await rejectLeave(formData)
    if (result?.error) setError(result.error)
    setActionLoading(null)
  }

  async function handleCancel() {
    setActionLoading('cancel')
    setError('')
    const formData = new FormData()
    formData.append('id', request.id)
    const result = await cancelLeave(formData)
    if (result?.error) setError(result.error)
    setActionLoading(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/manager/leaves`}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('employee')}</p>
              <p className="font-medium">{request.employee.firstName} {request.employee.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('type')}</p>
              <p className="font-medium">{request.leaveType.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('startDate')}</p>
              <p className="font-medium">{new Date(request.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('endDate')}</p>
              <p className="font-medium">{new Date(request.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('duration')}</p>
              <p className="font-medium">{request.durationDays} {tl('days')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tl('status')}</p>
              <p className="font-medium">{tl(`statuses.${request.status}`)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{tl('reason')}</p>
            <p className="mt-1">{request.reason}</p>
          </div>

          {request.attachmentFile && (
            <div>
              <p className="text-sm text-muted-foreground">{tl('attachment')}</p>
              <a href={request.attachmentFile} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                {tc('view')}
              </a>
            </div>
          )}

          {request.status === 'PENDING' && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <form action={handleApprove}>
                <Button type="submit" disabled={actionLoading !== null}>
                  {actionLoading === 'approve' ? tc('loading') : <><Check className="me-2 h-4 w-4" />{t('approve')}</>}
                </Button>
              </form>
              <Button variant="outline" onClick={() => setShowRejectForm(!showRejectForm)} disabled={actionLoading !== null}>
                <X className="me-2 h-4 w-4" />
                {t('reject')}
              </Button>
              <form action={handleCancel}>
                <Button variant="ghost" type="submit" disabled={actionLoading !== null} className="text-red-600">
                  {actionLoading === 'cancel' ? tc('loading') : t('cancel')}
                </Button>
              </form>
            </div>
          )}

          {request.status === 'APPROVED' && (
            <form action={handleCancel}>
              <Button variant="outline" type="submit" disabled={actionLoading !== null} className="text-red-600">
                {actionLoading === 'cancel' ? tc('loading') : t('cancel')}
              </Button>
            </form>
          )}

          {showRejectForm && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="rejectReason">{t('rejectionReasonPlaceholder')} *</Label>
              <textarea
                id="rejectReason"
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <form action={handleReject}>
                <Button variant="destructive" type="submit" disabled={!rejectReason || actionLoading !== null}>
                  {actionLoading === 'reject' ? tc('loading') : t('confirm')}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
