import LanguageSwitcher from './language-switcher'
import NotificationBell from '../notifications/notification-bell'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-[rgba(255,255,255,0.065)] bg-[#0D1028] px-5">
      <div className="flex-1" />
      <NotificationBell />
      <LanguageSwitcher />
    </header>
  )
}
