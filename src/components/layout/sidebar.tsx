'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Clock,
  Banknote,
  FolderOpen,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard' },
  { href: '/employees', icon: Users, label: 'employees' },
  { href: '/leave-requests', icon: CalendarCheck, label: 'leaveRequests' },
  { href: '/attendance', icon: Clock, label: 'attendance' },
  { href: '/payroll', icon: Banknote, label: 'payroll' },
  { href: '/documents', icon: FolderOpen, label: 'documents' },
] as const

export default function Sidebar() {
  const pathname = usePathname()
  const { locale } = useParams<{ locale: string }>()
  const t = useTranslations('nav')

  return (
    <aside className="fixed inset-y-0 start-0 z-20 hidden w-64 flex-col border-e bg-white lg:flex">
      <div className="flex h-14 items-center border-b px-6">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="h-5 w-5" />
          <span>Riman HR</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const href = `/${locale}${item.href}`
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={item.href} href={href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start', isActive && 'bg-zinc-100')}
              >
                <item.icon className="me-2 h-4 w-4" />
                {t(item.label)}
              </Button>
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-600"
          onClick={() => signOut({ callbackUrl: `/${locale}/auth/signin` })}
        >
          <LogOut className="me-2 h-4 w-4" />
          {t('signOut')}
        </Button>
      </div>
    </aside>
  )
}
