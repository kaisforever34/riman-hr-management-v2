import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import en from '@/i18n/messages/en.json'

vi.mock('next-intl/server', () => ({
  getTranslations: (namespace: string) =>
    Promise.resolve((key: string) => {
      const section = (en as unknown as Record<string, Record<string, string>>)[namespace]
      return section?.[key] ?? key
    }),
}))
