import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const { auth: authMiddleware } = NextAuth(authConfig)

export default authMiddleware((req) => {
  const { pathname } = req.nextUrl
  const isAuthPage = pathname.includes('/auth/')

  if (isAuthPage) {
    return intlMiddleware(req)
  }

  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin)
    return Response.redirect(signInUrl)
  }

  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
