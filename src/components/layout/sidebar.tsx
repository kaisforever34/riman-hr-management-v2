'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarRange,
  Clock,
  ListChecks,
  Banknote,
  FolderOpen,
  BarChart3,
  LogOut,
  ChevronLeft,
  BookUser,
  DoorOpen,
  Bell,
  ClipboardList,
  Package,
  Receipt,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [collapsed, setCollapsed] = useState(false)

  const isAdmin = role === 'HR_ADMIN' || role === 'MANAGER'
  const isEmployee = role === 'EMPLOYEE'

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard', show: true },
    { href: '/directory', icon: BookUser, label: 'directory', show: true },
    { href: '/notifications', icon: Bell, label: 'notifications', show: true },
    { href: '/employees', icon: Users, label: 'employees', show: isAdmin },
    { href: '/manager/onboarding', icon: DoorOpen, label: 'onboarding', show: isAdmin },
    { href: '/leave', icon: CalendarCheck, label: 'myLeaves', show: true },
    { href: '/onboarding', icon: DoorOpen, label: 'myOnboarding', show: isEmployee },
    { href: '/manager/leaves', icon: CalendarRange, label: 'leaveRequests', show: isAdmin },
    { href: '/attendance', icon: Clock, label: 'attendance', show: true },
    { href: '/manager/attendance', icon: ListChecks, label: 'managerAttendance', show: isAdmin },
    { href: '/manager/payroll', icon: Banknote, label: 'payroll', show: isAdmin },
    { href: '/manager/performance', icon: BarChart3, label: 'performance', show: isAdmin },
    { href: '/manager/analytics', icon: BarChart3, label: 'analytics', show: isAdmin },
    { href: '/manager/documents', icon: FolderOpen, label: 'documents', show: isAdmin },
    { href: '/manager/surveys', icon: ClipboardList, label: 'surveys', show: isAdmin },
    { href: '/manager/assets', icon: Package, label: 'assets', show: isAdmin },
    { href: '/manager/expenses', icon: Receipt, label: 'expenses', show: isAdmin },
    { href: '/surveys', icon: ClipboardList, label: 'mySurveys', show: isEmployee },
    { href: '/assets', icon: Package, label: 'myAssets', show: isEmployee },
    { href: '/expenses', icon: Receipt, label: 'myExpenses', show: isEmployee },
  ].filter((item) => item.show)

  return (
    <aside
      className={cn(
        "fixed top-0 start-0 h-screen z-50 flex flex-col bg-[#0D1028] border-r border-[rgba(255,255,255,0.065)] transition-all duration-200 overflow-y-auto",
        collapsed ? "w-14" : "w-52"
      )}
    >
      <div className={cn("flex items-center h-14 border-b border-[rgba(255,255,255,0.065)]", collapsed ? "justify-center px-0" : "px-5")}>
        <Link href="/dashboard" className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="w-7 h-7 rounded-md bg-[#D4A843] flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-[#0D0B07] font-syne">R</span>
          </div>
          {!collapsed && <span className="font-syne text-[15px] font-bold text-[#E0E6F4]">Riman</span>}
        </Link>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {navItems.map((item) => {
          const href = item.href
          const isActive = pathname === href || pathname.endsWith(href) || (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link key={item.href} href={href} prefetch className="block">
              <div
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-[rgba(212,168,67,0.12)] text-[#EFC254] border border-[rgba(212,168,67,0.2)]"
                    : "text-[#8B93A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E0E6F4]"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{t(item.label)}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[rgba(255,255,255,0.065)] py-2 px-2 space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 w-full px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 text-[#8B93A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E0E6F4]",
            collapsed && "justify-center px-2"
          )}
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className={cn(
            "flex items-center gap-3 w-full px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{t('signOut')}</span>}
        </button>
      </div>
    </aside>
  )
}
