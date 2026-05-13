'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface LeaveClientProps {
  requests: any[]
  balances: any[]
  leaveTypes: any[]
  locale: string
}

export default function LeaveClient({ requests, balances, leaveTypes, locale }: LeaveClientProps) {
  const t = useTranslations('leave')
  const tc = useTranslations('common')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href={`/${locale}/leave/new`} className={buttonVariants()}>
          <Plus className="me-2 h-4 w-4" />
          {t('submitNew')}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">{t('noBalance')}</p>
        )}
        {balances.map((b: any) => (
          <div key={b.id} className="rounded-lg border bg-white p-4">
            <p className="text-sm font-medium">{b.leaveType.name}</p>
            <p className="mt-1 text-2xl font-bold">
              {b.allocated + b.carriedOver - b.used}
              <span className="text-sm font-normal text-muted-foreground">
                /{b.allocated + b.carriedOver} {t('days')}
              </span>
            </p>
          </div>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-muted-foreground">{t('noLeaves')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('noLeavesDesc')}</p>
          <Link href={`/${locale}/leave/new`} className={buttonVariants({ className: 'mt-4' })}>
            {t('submitNew')}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left">
                <th className="p-3 font-medium">{t('type')}</th>
                <th className="p-3 font-medium">{t('startDate')}</th>
                <th className="p-3 font-medium">{t('endDate')}</th>
                <th className="p-3 font-medium">{t('duration')}</th>
                <th className="p-3 font-medium">{t('status')}</th>
                <th className="p-3 font-medium">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                  <td className="p-3">{r.leaveType.name}</td>
                  <td className="p-3">{new Date(r.startDate).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(r.endDate).toLocaleDateString()}</td>
                  <td className="p-3">{r.durationDays} {r.durationDays === 1 ? t('day') : t('days')}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      r.status === 'CANCELLED' ? 'bg-zinc-100 text-zinc-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {t(`statuses.${r.status}`)}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link href={`/${locale}/leave/${r.id}`} className="text-sm text-blue-600 hover:underline">
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
