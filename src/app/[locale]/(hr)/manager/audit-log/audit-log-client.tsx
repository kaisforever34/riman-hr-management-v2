'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'

interface AuditLogClientProps {
  logs: any[]
}

export default function AuditLogClient({ logs }: AuditLogClientProps) {
  const t = useTranslations('auditLog')
  const [filter, setFilter] = useState('')

  const filtered = filter
    ? logs.filter((log) => {
        const hay = `${log.action} ${log.actorEmail ?? ''} ${log.entityType} ${log.entityId ?? ''}`.toLowerCase()
        return hay.includes(filter.toLowerCase())
      })
    : logs

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={`${t('action')} / ${t('actor')} / ${t('entity')}`}
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-lg border bg-[#0D1028]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
              <th className="p-3 font-medium">{t('time')}</th>
              <th className="p-3 font-medium">{t('actor')}</th>
              <th className="p-3 font-medium">{t('action')}</th>
              <th className="p-3 font-medium">{t('entity')}</th>
              <th className="p-3 font-medium">{t('detail')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-center text-[#8B93A8]">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-3">{log.actorEmail || '-'}</td>
                  <td className="p-3 font-medium">{log.action}</td>
                  <td className="p-3">
                    {log.entityType}
                    {log.entityId ? `/${log.entityId}` : ''}
                  </td>
                  <td className="p-3 max-w-[280px] truncate text-[#8B93A8]">
                    {log.detail ? String(log.detail).slice(0, 80) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
