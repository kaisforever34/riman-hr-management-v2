import createMiddleware from 'next-intl/middleware'
import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'
import { authConfig } from '@/lib/auth.config'

const intlMiddleware = createMiddleware(routing)
const { auth } = NextAuth(authConfig)

const LOCALES = routing.locales

function localeFromPath(pathname: string): string | null {
  const segment = pathname.split('/')[1]
  return LOCALES.includes(segment as (typeof LOCALES)[number]) ? segment : null
}

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('/favicon.ico')) {
    return NextResponse.next()
  }

  const response = intlMiddleware(req)

  const locale = localeFromPath(pathname) ?? routing.defaultLocale
  const isAuthPage = pathname.includes('/auth/')
  const isManagerRoute = /\/manager(\/|$)/.test(pathname)

  if (isAuthPage) {
    if (req.auth?.user) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.nextUrl))
    }
    return response
  }

  if (!req.auth?.user) {
    const signInUrl = new URL(`/${locale}/auth/signin`, req.nextUrl)
    return NextResponse.redirect(signInUrl)
  }

  if (isManagerRoute) {
    const role = req.auth.user.role
    if (role !== 'MANAGER' && role !== 'HR_ADMIN') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.nextUrl))
    }
  }

  return response
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
