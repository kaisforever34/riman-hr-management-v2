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
  Clock,
  UserX,
  Settings,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function Sidebar({ role, companyName = 'Riman HR', logoLetter = 'R' }: { role: string; companyName?: string; logoLetter?: string }) {
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
    { href: `/${locale}/attendance`, icon: Clock, label: 'myAttendance', show: isAdmin },
    { href: `/${locale}/leave`, icon: CalendarRange, label: 'myLeave', show: isAdmin },
    { href: `/${locale}/manager/onboarding`, icon: DoorOpen, label: 'onboarding', show: isAdmin },

    { href: `/${locale}/manager/leaves`, icon: CalendarRange, label: 'leaveRequests', show: isAdmin },

    { href: `/${locale}/manager/attendance`, icon: ListChecks, label: 'managerAttendance', show: isAdmin },
    { href: `/${locale}/manager/attendance/overtime`, icon: Clock, label: 'overtime', show: isAdmin },
    { href: `/${locale}/manager/payroll`, icon: Banknote, label: 'payroll', show: isAdmin },
    { href: `/${locale}/manager/performance`, icon: BarChart3, label: 'performance', show: isAdmin },
    { href: `/${locale}/manager/analytics`, icon: BarChart3, label: 'analytics', show: isAdmin },
    { href: `/${locale}/manager/documents`, icon: FolderOpen, label: 'documents', show: isAdmin },
    { href: `/${locale}/manager/surveys`, icon: ClipboardList, label: 'surveys', show: isAdmin },
    { href: `/${locale}/manager/assets`, icon: Package, label: 'assets', show: isAdmin },
    { href: `/${locale}/manager/expenses`, icon: Receipt, label: 'expenses', show: isAdmin },
    { href: `/${locale}/manager/holidays`, icon: CalendarRange, label: 'holidays', show: isAdmin },
    { href: `/${locale}/manager/audit-log`, icon: ListChecks, label: 'auditLog', show: isHrAdmin },
    { href: `/${locale}/manager/terminations`, icon: UserX, label: 'terminations', show: isHrAdmin },
    { href: `/${locale}/manager/settings`, icon: Settings, label: 'settings', show: isHrAdmin },

  ].filter((item) => item.show)

  const sidebarContent = (
    <>
      <div className={cn("flex items-center h-14 border-b border-sidebar-border", collapsed ? "justify-center px-0" : "px-5")}>
        <Link href={`/${locale}/dashboard`} className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div className="w-7 h-7 rounded-md bg-gold flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-primary-foreground font-syne">{logoLetter}</span>
          </div>
          {!collapsed && <span className="font-syne text-[15px] font-bold text-ledger-text tracking-tight">{companyName}</span>}
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
                    ? "bg-gold/10 text-gold-bright border border-gold/20"
                    : "text-ledger-text-secondary hover:bg-sidebar-accent hover:text-ledger-text border border-transparent"
                )}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span className="truncate">{t(item.label)}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border py-2 px-2 space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          className={cn(
            "hidden md:flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-ledger-text-secondary hover:bg-sidebar-accent hover:text-ledger-text",
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
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-audit-red hover:bg-destructive/10",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{t('signOut')}</span>}
        </button>
      </div>

      {/* Signature — always visible at sidebar bottom */}
      <div className={cn(
        "px-3 py-2.5 border-t border-sidebar-border",
        collapsed ? "text-center" : "flex items-center gap-2"
      )}>
        {collapsed ? (
          <span className="text-[10px] font-bold text-gold leading-none" title="Powered by KAIS">K</span>
        ) : (
          <span className="text-[10.5px] leading-none text-ledger-text-muted">
            Powered by <span className="font-semibold text-gold">KAIS</span>
          </span>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label={t('openMenu')}
        className="fixed top-3 start-3 z-50 md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar border border-sidebar-border text-ledger-text-secondary hover:text-ledger-text transition-colors"
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
          "fixed top-0 start-0 h-screen z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
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
            className="absolute top-3 end-3 md:hidden flex items-center justify-center w-7 h-7 rounded-md text-ledger-text-secondary hover:text-ledger-text hover:bg-sidebar-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {sidebarContent}
      </aside>
    </>
  )
}
