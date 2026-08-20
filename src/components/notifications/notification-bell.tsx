'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { markAllAsRead } from '@/lib/actions/notifications'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [recent, setRecent] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    async function fetchCount() {
      const res = await fetch('/api/notifications/unread-count')
      if (res.ok) {
        const data = await res.json()
        setCount(data.count)
        setRecent(data.recent || [])
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleMarkAllRead() {
    await markAllAsRead()
    setCount(0)
    setRecent([])
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
        className="relative p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
      >
        <Bell className="w-4 h-4 text-[#8B93A8]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-[#D4A843] text-[#07091A] text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-80 bg-[#0D1028] border border-[rgba(255,255,255,0.065)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] overflow-hidden z-50">
          <div className="p-3 border-b border-[rgba(255,255,255,0.065)] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#E0E6F4]">Notifications</span>
            {count > 0 && (
              <button onClick={handleMarkAllRead} className="text-[12px] text-[#D4A843] hover:text-[#EFC254] transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 && (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-[#4A5168] mx-auto mb-2" />
                <p className="text-[13px] text-[#8B93A8]">No new notifications</p>
              </div>
            )}
            {recent.map((n) => (
              <Link
                key={n.id}
                href={`/${locale}${n.link || '#'}`}
                onClick={() => setOpen(false)}
                className="block p-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                <div className="text-[13px] text-[#E0E6F4] font-medium">{n.title}</div>
                {n.message && <div className="text-[12px] text-[#8B93A8] mt-0.5 line-clamp-2">{n.message}</div>}
                <div className="text-[11px] text-[#4A5168] mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </Link>
            ))}
          </div>

          <Link
            href={`/${locale}/notifications`}
            onClick={() => setOpen(false)}
            className="block p-3 text-center text-[13px] font-medium text-[#D4A843] hover:text-[#EFC254] hover:bg-[rgba(212,168,67,0.05)] border-t border-[rgba(255,255,255,0.065)] transition-colors"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
