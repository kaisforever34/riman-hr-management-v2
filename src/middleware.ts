import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const intlMiddleware = createMiddleware(routing)

const PUBLIC_PATHS = ['/auth/signin']

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isPublic = PUBLIC_PATHS.some((p) => pathname.includes(p))
  if (!isPublic) {
    const session = await auth()
    if (!session?.user) {
      const locale = pathname.split('/')[1]
      return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url))
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
