'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Calendar, Check, X, Plus } from 'lucide-react'
import { bulkApproveLeaves, bulkRejectLeaves } from '@/lib/actions/leave'
import SubmitLeaveDialog from '@/components/manager-leaves/SubmitLeaveDialog'

interface ManagerLeavesClientProps {
  requests: any[]
  leaveTypes: any[]
  employees: { id: string; firstName: string; lastName: string }[]
  locale: string
  currentFilters: Record<string, string | undefined>
}

export default function ManagerLeavesClient({
  requests,
  leaveTypes,
  employees,
  locale,
  currentFilters,
}: ManagerLeavesClientProps) {
  const t = useTranslations('managerLeaves')
  const tb = useTranslations('managerLeaves.bulk')
  const tc = useTranslations('common')
  const tl = useTranslations('leave')
  const router = useRouter()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showSubmitLeave, setShowSubmitLeave] = useState(false)

  const pendingRequests = requests.filter((r) => r.status === 'PENDING')
  const allPendingSelected =
    pendingRequests.length > 0 && pendingRequests.every((r) => selected.has(r.id))

  const exportParams = new URLSearchParams()
  exportParams.set('year', String(new Date().getUTCFullYear()))
  if (currentFilters.status) exportParams.set('status', currentFilters.status)
  const exportHref = `/api/export/leaves?${exportParams.toString()}`

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams()
    Object.entries(currentFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/${locale}/manager/leaves?${params.toString()}`)
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllPending() {
    setSelected(() => {
      if (allPendingSelected) return new Set()
      return new Set(pendingRequests.map((r) => r.id))
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setShowReject(false)
    setRejectReason('')
  }

  function buildFormData(): FormData {
    const fd = new FormData()
    selected.forEach((id) => fd.append('ids', id))
    return fd
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return
    setBusy('approve')
    const res = await bulkApproveLeaves(buildFormData())
    setBusy(null)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success(tb('result', { approved: res.approved, failed: res.failed.length }))
    if (res.failed.length > 0) {
      toast.error(
        res.failed
          .map((f) => `${f.id}: ${f.error}`)
          .join('\n'),
      )
    }
    clearSelection()
    router.refresh()
  }

  async function handleBulkReject() {
    if (selected.size === 0 || !rejectReason) return
    setBusy('reject')
    const fd = buildFormData()
    fd.append('rejectReason', rejectReason)
    const res = await bulkRejectLeaves(fd)
    setBusy(null)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success(tb('rejectResult', { rejected: res.rejected, failed: res.failed.length }))
    if (res.failed.length > 0) {
      toast.error(
        res.failed
          .map((f) => `${f.id}: ${f.error}`)
          .join('\n'),
      )
    }
    clearSelection()
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Link href={exportHref} className={buttonVariants({ variant: 'outline' })}>
            {tc('exportCsv')}
          </Link>
          <Link href={`/${locale}/manager/leaves/calendar`} className={buttonVariants({ variant: 'outline' })}>
            <Calendar className="me-2 h-4 w-4" />
            {t('calendar')}
          </Link>
          <Button onClick={() => setShowSubmitLeave(true)} className="bg-[#22C55E] text-white hover:bg-[#1Fb053]">
            <Plus className="me-2 h-4 w-4" />
            {t('submitLeaveForEmployee')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label className="text-xs">{t('filterByEmployee')}</Label>
          <Select onValueChange={(v) => applyFilter('employeeId', v ?? '')} value={currentFilters.employeeId || ''}>
            <SelectTrigger><SelectValue placeholder={tl('selectType')} /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('filterByStatus')}</Label>
          <Select onValueChange={(v) => applyFilter('status', v ?? '')} value={currentFilters.status || ''}>
            <SelectTrigger><SelectValue placeholder={tl('selectType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">{tl('statuses.PENDING')}</SelectItem>
              <SelectItem value="APPROVED">{tl('statuses.APPROVED')}</SelectItem>
              <SelectItem value="REJECTED">{tl('statuses.REJECTED')}</SelectItem>
              <SelectItem value="CANCELLED">{tl('statuses.CANCELLED')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('filterByType')}</Label>
          <Select onValueChange={(v) => applyFilter('leaveTypeId', v ?? '')} value={currentFilters.leaveTypeId || ''}>
            <SelectTrigger><SelectValue placeholder={tl('selectType')} /></SelectTrigger>
            <SelectContent>
              {leaveTypes.map((lt: any) => (
                <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border bg-[#0D1028] p-12 text-center text-[#8B93A8]">
          {t('noRequests')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-[#0D1028]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    aria-label={tb('selectPendingOnly')}
                    checked={allPendingSelected}
                    disabled={pendingRequests.length === 0}
                    onChange={toggleAllPending}
                    className="h-4 w-4 cursor-pointer accent-[#22C55E]"
                  />
                </th>
                <th className="p-3 font-medium">{t('employee')}</th>
                <th className="p-3 font-medium">{tl('type')}</th>
                <th className="p-3 font-medium">{tl('startDate')}</th>
                <th className="p-3 font-medium">{tl('endDate')}</th>
                <th className="p-3 font-medium">{tl('duration')}</th>
                <th className="p-3 font-medium">{tl('status')}</th>
                <th className="p-3 font-medium">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="p-3">
                    {r.status === 'PENDING' && (
                      <input
                        type="checkbox"
                        aria-label={`${tb('selectPendingOnly')} ${r.id}`}
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="h-4 w-4 cursor-pointer accent-[#22C55E]"
                      />
                    )}
                  </td>
                  <td className="p-3">{r.employee.firstName} {r.employee.lastName}</td>
                  <td className="p-3">{r.leaveType.name}</td>
                  <td className="p-3">{new Date(r.startDate).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(r.endDate).toLocaleDateString()}</td>
                  <td className="p-3">{r.durationDays}d</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'APPROVED' ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' :
                      r.status === 'REJECTED' ? 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]' :
                      r.status === 'CANCELLED' ? 'bg-[#181E38] text-[#8B93A8]' :
                      'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
                    }`}>
                      {tl(`statuses.${r.status}`)}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link href={`/${locale}/manager/leaves/${r.id}`} className="text-sm text-[#4B8BF0] hover:underline">
                      {tc('view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11152E] p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-[#8B93A8]">
              {tb('selected', { count: selected.size })}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleBulkApprove}
                disabled={busy !== null}
                className="bg-[#22C55E] text-white hover:bg-[#1Fb053]"
              >
                <Check className="me-2 h-4 w-4" />
                {tb('approveSelected', { count: selected.size })}
              </Button>
              {!showReject && (
                <Button type="button" variant="outline" onClick={() => setShowReject(true)} disabled={busy !== null}>
                  <X className="me-2 h-4 w-4" />
                  {tb('rejectSelected')}
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={clearSelection} disabled={busy !== null}>
                {tb('clear')}
              </Button>
            </div>
          </div>

          {showReject && (
            <div className="space-y-2 border-t border-[rgba(255,255,255,0.08)] pt-3">
              <Label htmlFor="bulkRejectReason">{t('rejectionReasonPlaceholder')} *</Label>
              <textarea
                id="bulkRejectReason"
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowReject(false)} disabled={busy !== null}>
                  {tc('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleBulkReject}
                  disabled={!rejectReason || busy !== null}
                >
                  {busy === 'reject' ? tc('loading') : tb('rejectSelected')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      <SubmitLeaveDialog
        open={showSubmitLeave}
        onOpenChange={setShowSubmitLeave}
        employees={employees}
        leaveTypes={leaveTypes}
        onSuccess={() => {
          setShowSubmitLeave(false)
          router.refresh()
        }}
      />
    </div>
  )
}