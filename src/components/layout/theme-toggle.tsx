'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

type ThemeMode = 'light' | 'dark' | 'system'

const NEXT: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const LABEL: Record<string, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
}

export function ThemeToggle() {
  const { resolvedTheme, theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Match the icon to the actually-applied theme so "system" reflects the OS state.
  const isLight = resolvedTheme === 'light'
  const Icon = isLight ? Sun : Moon

  if (!mounted) {
    // Stable placeholder to avoid hydration mismatch
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ledger-text-secondary"
      >
        <Moon className="size-4" />
      </button>
    )
  }

  const current = (theme as ThemeMode) || 'system'

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[current])}
      aria-label={`${LABEL[current] ?? 'Theme'}. Click to switch to ${NEXT[current]}.`}
      title={`${LABEL[current] ?? 'Theme'} — click for ${NEXT[current]}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ledger-text-secondary transition-colors hover:bg-crest-stratum hover:text-ledger-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-4" />
    </button>
  )
}