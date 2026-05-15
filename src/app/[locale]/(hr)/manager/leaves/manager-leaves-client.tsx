'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { Calendar } from 'lucide-react'

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
  const tc = useTranslations('common')
  const tl = useTranslations('leave')
  const router = useRouter()

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams()
    Object.entries(currentFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/${locale}/manager/leaves?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href={`/${locale}/manager/leaves/calendar`} className={buttonVariants({ variant: 'outline' })}>
          <Calendar className="me-2 h-4 w-4" />
          {t('calendar')}
        </Link>
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
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          {t('noRequests')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
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
                    <Link href={`/${locale}/manager/leaves/${r.id}`} className="text-sm text-inquiry-blue hover:underline">
                      {tc('view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
