import LanguageSwitcher from './language-switcher'

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-white px-4 lg:px-6">
      <div className="flex-1" />
      <LanguageSwitcher />
    </header>
  )
}
