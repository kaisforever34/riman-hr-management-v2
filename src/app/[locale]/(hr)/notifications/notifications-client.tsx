'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { markAsRead, markAllAsRead, getNotifications } from '@/lib/actions/notifications'
import { CheckCheck, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationsClient({ initial, locale }: { initial: { notifications: Notification[]; total: number }; locale: string }) {
  const t = useTranslations('notifications')
  const router = useRouter()
  const [notifications, setNotifications] = useState(initial.notifications)
  const [total, setTotal] = useState(initial.total)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)

  async function handleMarkRead(id: string) {
    await markAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    router.refresh()
  }

  async function handleMarkAllRead() {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setTotal(0)
    router.refresh()
  }

  async function toggleFilter() {
    const newVal = !unreadOnly
    setUnreadOnly(newVal)
    const data = await getNotifications(1, newVal)
    setNotifications(data.notifications)
    setTotal(data.total)
    setPage(1)
  }

  const typeColors: Record<string, string> = {
    LEAVE_SUBMITTED: 'text-[#D4A843]',
    LEAVE_APPROVED: 'text-[#22A854]',
    LEAVE_REJECTED: 'text-[#EF4444]',
    ONBOARDING_TASK: 'text-[#3B82F6]',
    OFFBOARDING_TASK: 'text-[#A855F7]',
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFilter}
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${unreadOnly ? 'bg-[#D4A843] text-[#07091A]' : 'text-[#8B93A8] hover:text-[#E0E6F4]'}`}
          >
            {t('unreadOnly')}
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-sm text-[#D4A843] hover:text-[#EFC254]">
              <CheckCheck className="w-4 h-4" />
              {t('markAllRead')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {notifications.length === 0 && (
          <div className="py-12 text-center">
            <Bell className="w-8 h-8 text-[#5A6278] mx-auto mb-3" />
            <p className="text-[#8B93A8] text-sm">{t('empty')}</p>
          </div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              n.isRead
                ? 'bg-[#0D0F1A] border-[rgba(255,255,255,0.04)] opacity-60'
                : 'bg-[rgba(212,168,67,0.03)] border-[#D4A84322]'
            }`}
          >
            <Link
              href={`/${locale}${n.link || '#'}`}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg ${typeColors[n.type] || 'text-[#8B93A8]'}`}>●</span>
                <span className="text-sm font-medium text-[#E0E6F4]">{n.title}</span>
              </div>
              {n.message && <p className="text-xs text-[#8B93A8] mt-0.5 ml-5">{n.message}</p>}
              <p className="text-[10px] text-[#5A6278] mt-1 ml-5">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
            </Link>
            {!n.isRead && (
              <button
                onClick={() => handleMarkRead(n.id)}
                className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)] text-[#8B93A8] hover:text-[#D4A843] flex-shrink-0"
                title={t('markRead')}
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={async () => { const d = await getNotifications(page - 1, unreadOnly); setNotifications(d.notifications); setPage(page - 1) }}
            disabled={page <= 1}
            className="px-3 py-1 text-sm text-[#8B93A8] hover:text-[#E0E6F4] disabled:opacity-30"
          >
            {t('previous')}
          </button>
          <span className="px-3 py-1 text-sm text-[#8B93A8]">{page}</span>
          <button
            onClick={async () => { const d = await getNotifications(page + 1, unreadOnly); setNotifications(d.notifications); setPage(page + 1) }}
            disabled={page * 20 >= total}
            className="px-3 py-1 text-sm text-[#8B93A8] hover:text-[#E0E6F4] disabled:opacity-30"
          >
            {t('next')}
          </button>
        </div>
      )}
    </div>
  )
}
