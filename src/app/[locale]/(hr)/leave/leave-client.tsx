'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Plus, CalendarCheck } from 'lucide-react'

interface LeaveClientProps {
  requests: any[]
  balances: any[]
  locale: string
}

export default function LeaveClient({ requests, balances, locale }: LeaveClientProps) {
  const t = useTranslations('leave')
  const tc = useTranslations('common')

  return (
    <div className="fi space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-syne text-2xl font-bold text-[#E0E6F4] tracking-tight">{t('title')}</h1>
        <Link href={`/${locale}/leave/new`} className={buttonVariants()}>
          <Plus className="me-2 h-4 w-4" />
          {t('submitNew')}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.length === 0 && (
          <p className="col-span-full text-[13px] text-[#8B93A8]">{t('noBalance')}</p>
        )}
        {balances.map((b: any) => (
          <div key={b.id} className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-4">
            <p className="text-[13px] font-medium text-[#E0E6F4]">{b.leaveType.name}</p>
            <p className="mt-1 font-syne text-2xl font-bold text-[#E0E6F4]">
              {b.allocated + b.carriedOver - b.used}
              <span className="text-[13px] font-normal text-[#8B93A8]">
                /{b.allocated + b.carriedOver} {t('days')}
              </span>
            </p>
          </div>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] border-dashed p-12 text-center">
          <CalendarCheck className="w-10 h-10 text-[#4A5168] mx-auto mb-3" />
          <p className="text-[13px] font-medium text-[#E0E6F4]">{t('noLeaves')}</p>
          <p className="mt-1 text-[12px] text-[#8B93A8]">{t('noLeavesDesc')}</p>
          <Link href={`/${locale}/leave/new`} className={buttonVariants({ className: 'mt-4' })}>
            {t('submitNew')}
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] overflow-hidden">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.065)]">
                <th className="px-3.5 py-2.5 text-left text-[11px] font-bold tracking-[0.08em] uppercase text-[#4A5168]">{t('type')}</th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-bold tracking-[0.08em] uppercase text-[#4A5168]">{t('startDate')}</th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-bold tracking-[0.08em] uppercase text-[#4A5168]">{t('endDate')}</th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-bold tracking-[0.08em] uppercase text-[#4A5168]">{t('duration')}</th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-bold tracking-[0.08em] uppercase text-[#4A5168]">{t('status')}</th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-bold tracking-[0.08em] uppercase text-[#4A5168]">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.018)] transition-colors">
                  <td className="px-3.5 py-2.5 text-[#E0E6F4]">{r.leaveType.name}</td>
                  <td className="px-3.5 py-2.5 text-[#8B93A8]">{new Date(r.startDate).toLocaleDateString()}</td>
                  <td className="px-3.5 py-2.5 text-[#8B93A8]">{new Date(r.endDate).toLocaleDateString()}</td>
                  <td className="px-3.5 py-2.5 text-[#8B93A8]">{r.durationDays} {r.durationDays === 1 ? t('day') : t('days')}</td>
                  <td className="px-3.5 py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                      r.status === 'APPROVED' ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border border-[rgba(34,197,94,0.2)]' :
                      r.status === 'REJECTED' ? 'bg-[rgba(239,68,68,0.08)] text-[#EF4444] border border-[rgba(239,68,68,0.15)]' :
                      r.status === 'CANCELLED' ? 'bg-[#181E38] text-[#8B93A8] border border-[rgba(255,255,255,0.065)]' :
                      'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]'
                    }`}>
                      {t(`statuses.${r.status}`)}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Link href={`/${locale}/leave/${r.id}`} className="text-[13px] text-[#4B8BF0] hover:underline">
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
