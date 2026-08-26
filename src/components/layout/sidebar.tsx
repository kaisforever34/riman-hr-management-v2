'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CalendarRange,
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
  Menu,
  X,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('nav')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isAdmin = role === 'HR_ADMIN' || role === 'MANAGER'
  const isHrAdmin = role === 'HR_ADMIN'

  const navItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: 'dashboard', show: true },
    { href: `/${locale}/directory`, icon: BookUser, label: 'directory', show: true },
    { href: `/${locale}/notifications`, icon: Bell, label: 'notifications', show: true },
    { href: `/${locale}/employees`, icon: Users, label: 'employees', show: isAdmin },
    { href: `/${locale}/manager/onboarding`, icon: DoorOpen, label: 'onboarding', show: isAdmin },

    { href: `/${locale}/manager/leaves`, icon: CalendarRange, label: 'leaveRequests', show: isAdmin },

    { href: `/${locale}/manager/attendance`, icon: ListChecks, label: 'managerAttendance', show: isAdmin },
    { href: `/${locale}/manager/payroll`, icon: Banknote, label: 'payroll', show: isAdmin },
    { href: `/${locale}/manager/performance`, icon: BarChart3, label: 'performance', show: isAdmin },
    { href: `/${locale}/manager/analytics`, icon: BarChart3, label: 'analytics', show: isAdmin },
    { href: `/${locale}/manager/documents`, icon: FolderOpen, label: 'documents', show: isAdmin },
    { href: `/${locale}/manager/surveys`, icon: ClipboardList, label: 'surveys', show: isAdmin },
    { href: `/${locale}/manager/assets`, icon: Package, label: 'assets', show: isAdmin },
    { href: `/${locale}/manager/expenses`, icon: Receipt, label: 'expenses', show: isAdmin },
    { href: `/${locale}/manager/holidays`, icon: CalendarRange, label: 'holidays', show: isAdmin },
    { href: `/${locale}/manager/audit-log`, icon: ListChecks, label: 'auditLog', show: isHrAdmin },

  ].filter((item) => item.show)

  const sidebarContent = (
    <>
      <div className={cn("flex items-center h-14 border-b border-[rgba(255,255,255,0.065)]", collapsed ? "justify-center px-0" : "px-5")}>
        <Link href={`/${locale}/dashboard`} className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div className="w-7 h-7 rounded-md bg-[#D4A843] flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-[#0D0B07] font-syne">R</span>
          </div>
          {!collapsed && <span className="font-syne text-[15px] font-bold text-[#E0E6F4] tracking-tight">Riman HR</span>}
        </Link>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const href = item.href
          const isActive = pathname === href || pathname.endsWith(href) || (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link key={item.href} href={href} prefetch className="block">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-[rgba(212,168,67,0.12)] text-[#EFC254] border border-[rgba(212,168,67,0.2)]"
                    : "text-[#8B93A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E0E6F4] border border-transparent"
                )}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span className="truncate">{t(item.label)}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[rgba(255,255,255,0.065)] py-2 px-2 space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          className={cn(
            "hidden md:flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-[#8B93A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E0E6F4]",
            collapsed && "justify-center px-2"
          )}
        >
          <ChevronLeft className={cn("w-[18px] h-[18px] transition-transform duration-200", collapsed && "rotate-180")} />
          {!collapsed && <span>{t('collapse')}</span>}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: `/${locale}/auth/signin` })}
          aria-label={t('signOut')}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{t('signOut')}</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label={t('openMenu')}
        className="fixed top-3 start-3 z-50 md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-[#0D1028] border border-[rgba(255,255,255,0.065)] text-[#8B93A8] hover:text-[#E0E6F4] transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 start-0 h-screen z-50 flex flex-col bg-[#0D1028] border-r border-[rgba(255,255,255,0.065)] transition-all duration-200",
          // Desktop
          "hidden md:flex",
          collapsed ? "md:w-16" : "md:w-60",
          // Mobile
          mobileOpen ? "flex w-60" : "hidden md:flex"
        )}
      >
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            aria-label={t('closeMenu')}
            className="absolute top-3 end-3 md:hidden flex items-center justify-center w-7 h-7 rounded-md text-[#8B93A8] hover:text-[#E0E6F4] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {sidebarContent}
      </aside>
    </>
  )
}
