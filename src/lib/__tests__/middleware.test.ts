/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { NextResponse } from 'next/server'

const { middlewareHandler } = vi.hoisted(() => ({
  middlewareHandler: { current: null as any },
}))

vi.mock('next-auth', () => ({
  default: () => ({
    auth: (handler: any) => {
      middlewareHandler.current = handler
      return handler
    },
  }),
}))
vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next(),
}))
vi.mock('@/lib/auth.config', () => ({ authConfig: {} }))

import '@/middleware'

function makeReq(pathname: string, auth?: { user?: Record<string, unknown> } | null) {
  const url = new URL(`http://localhost${pathname}`)
  return { nextUrl: url, url: url.toString(), auth } as any
}

function run(pathname: string, auth?: { user?: Record<string, unknown> } | null) {
  return middlewareHandler.current(makeReq(pathname, auth))
}

describe('middleware', () => {
  it('serves the sign-in page to an authenticated user instead of bouncing them away', async () => {
    const res = await run('/en/auth/signin', { user: { id: 'u1', role: 'EMPLOYEE' } })
    expect(res.headers.get('location')).toBeNull()
  })

  it('serves the sign-in page to an unauthenticated user without a redirect loop', async () => {
    const res = await run('/en/auth/signin', null)
    expect(res.headers.get('location')).toBeNull()
  })

  it('redirects unauthenticated users from protected routes to signin', async () => {
    const res = await run('/en/dashboard', null)
    expect(res.headers.get('location')).toBe('http://localhost/en/auth/signin')
  })

  it('redirects non-manager users away from manager routes', async () => {
    const res = await run('/en/manager/leaves', {
      user: { id: 'u1', role: 'EMPLOYEE' },
    })
    expect(res.headers.get('location')).toBe('http://localhost/en/dashboard')
  })
})
