import LanguageSwitcher from './language-switcher'
import NotificationBell from '../notifications/notification-bell'
import { Avatar } from '@/components/shared'
import { auth } from '@/lib/auth'

export default async function Header() {
  const session = await auth()
  const initials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[rgba(255,255,255,0.065)] bg-[#0D1028]/80 backdrop-blur-xl px-4 md:px-5">
      <div className="flex-1" />
      <NotificationBell />
      <LanguageSwitcher />
      <div className="ms-1 flex items-center gap-2.5 ps-3 border-s border-[rgba(255,255,255,0.065)]">
        <Avatar ini={initials} sz={30} />
        <div className="hidden md:block">
          <div className="text-[13px] font-medium text-[#E0E6F4] leading-tight">{session?.user?.name || 'User'}</div>
          <div className="text-[11px] text-[#4A5168] leading-tight">{session?.user?.role?.replace('_', ' ')}</div>
        </div>
      </div>
    </header>
  )
}
