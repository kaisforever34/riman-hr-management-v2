'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Check, X, Pencil } from 'lucide-react'
import Link from 'next/link'
import { approveLeave, rejectLeave, cancelLeave, updateLeave } from '@/lib/actions/leave'
import { format } from 'date-fns'

interface ManagerLeaveActionClientProps {
  request: any
  leaveTypes: { id: string; name: string }[]
  locale: string
}

export default function ManagerLeaveActionClient({ request, leaveTypes, locale }: ManagerLeaveActionClientProps) {
  const t = useTranslations('managerLeaves')
  const tl = useTranslations('leave')
  const tc = useTranslations('common')
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    leaveTypeId: request.leaveType.id,
    startDate: format(new Date(request.startDate), 'yyyy-MM-dd'),
    endDate: format(new Date(request.endDate), 'yyyy-MM-dd'),
    reason: request.reason || '',
    status: request.status,
  })

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

  async function handleUpdate() {
    setActionLoading('update')
    setError('')
    const formData = new FormData()
    formData.append('id', request.id)
    formData.append('leaveTypeId', editData.leaveTypeId)
    formData.append('startDate', editData.startDate)
    formData.append('endDate', editData.endDate)
    formData.append('reason', editData.reason)
    formData.append('status', editData.status)
    const result = await updateLeave(formData)
    setActionLoading(null)
    if (result?.error) {
      setError(result.error)
      return
    }
    toast.success(t('updated'))
    setEditMode(false)
    router.refresh()
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('requestDetails')}</h2>
            {!editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Pencil className="me-2 h-3 w-3" />
                {tc('edit')}
              </Button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">{tl('type')}</Label>
                  <select
                    className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                    value={editData.leaveTypeId}
                    onChange={e => setEditData(d => ({ ...d, leaveTypeId: e.target.value }))}
                  >
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>{lt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">{tl('status')}</Label>
                  <select
                    className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                    value={editData.status}
                    onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                  >
                    <option value="PENDING">{tl('statuses.PENDING')}</option>
                    <option value="APPROVED">{tl('statuses.APPROVED')}</option>
                    <option value="REJECTED">{tl('statuses.REJECTED')}</option>
                    <option value="CANCELLED">{tl('statuses.CANCELLED')}</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">{tl('startDate')}</Label>
                  <input
                    type="date"
                    className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                    value={editData.startDate}
                    onChange={e => setEditData(d => ({ ...d, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">{tl('endDate')}</Label>
                  <input
                    type="date"
                    className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                    value={editData.endDate}
                    onChange={e => setEditData(d => ({ ...d, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">{tl('reason')}</Label>
                <textarea
                  className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm"
                  rows={3}
                  value={editData.reason}
                  onChange={e => setEditData(d => ({ ...d, reason: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdate} disabled={actionLoading !== null}>
                  {actionLoading === 'update' ? tc('loading') : tc('save')}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)} disabled={actionLoading !== null}>
                  {tc('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <>
            <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-[#8B93A8]">{t('employee')}</p>
              <p className="font-medium">{request.employee.firstName} {request.employee.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-[#8B93A8]">{tl('type')}</p>
              <p className="font-medium">{request.leaveType.name}</p>
            </div>
            <div>
              <p className="text-sm text-[#8B93A8]">{tl('startDate')}</p>
              <p className="font-medium">{new Date(request.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-[#8B93A8]">{tl('endDate')}</p>
              <p className="font-medium">{new Date(request.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-[#8B93A8]">{tl('duration')}</p>
              <p className="font-medium">{request.durationDays} {tl('days')}</p>
            </div>
            <div>
              <p className="text-sm text-[#8B93A8]">{tl('status')}</p>
              <p className="font-medium">{tl(`statuses.${request.status}`)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-[#8B93A8]">{tl('reason')}</p>
            <p className="mt-1">{request.reason}</p>
          </div>

          {request.attachmentFile && (
            <div>
              <p className="text-sm text-[#8B93A8]">{tl('attachment')}</p>
              <a href={`/api/documents/leave/${request.id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
