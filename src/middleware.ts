import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Skip special paths
  if (pathname.startsWith('/api')) return NextResponse.next()
  if (pathname.startsWith('/_next') || pathname.includes('/favicon.ico')) return NextResponse.next()

  // Let next-intl handle locale detection, redirect, cookie sync, and headers
  const response = intlMiddleware(req)

  // Allow auth pages through regardless of session
  if (pathname.includes('/auth/')) {
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
