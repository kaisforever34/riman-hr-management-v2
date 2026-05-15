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
        className="relative p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
      >
        <Bell className="w-4 h-4 text-[#8B93A8]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#D4A843] text-[#07091A] text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0D0F1A] border border-[rgba(255,255,255,0.065)] rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-[rgba(255,255,255,0.065)] flex items-center justify-between">
            <span className="text-sm font-medium text-[#E0E6F4]">Notifications</span>
            {count > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-[#D4A843] hover:text-[#EFC254]">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 && (
              <div className="p-6 text-center text-[#8B93A8] text-sm">No new notifications</div>
            )}
            {recent.map((n) => (
              <Link
                key={n.id}
                href={`/${locale}${n.link || '#'}`}
                onClick={() => setOpen(false)}
                className="block p-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <div className="text-sm text-[#E0E6F4] font-medium">{n.title}</div>
                {n.message && <div className="text-xs text-[#8B93A8] mt-0.5 line-clamp-2">{n.message}</div>}
                <div className="text-[10px] text-[#5A6278] mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </Link>
            ))}
          </div>

          <Link
            href={`/${locale}/notifications`}
            onClick={() => setOpen(false)}
            className="block p-3 text-center text-sm text-[#D4A843] hover:text-[#EFC254] border-t border-[rgba(255,255,255,0.065)]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
