'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const params = useParams<{ locale: string }>()
  const router = useRouter()

  const otherLocale = params.locale === 'en' ? 'ar' : 'en'

  function switchLanguage() {
    const newPath = pathname.replace(`/${params.locale}`, `/${otherLocale}`)
    router.push(newPath)
  }

  return (
    <Button variant="outline" size="sm" onClick={switchLanguage}>
      {otherLocale === 'ar' ? 'العربية' : 'English'}
    </Button>
  )
}
