/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { capturedConfig, mockDb } = vi.hoisted(() => {
  const capturedConfig: { current: any } = { current: null }
  const mockDb = {
    user: { findUnique: vi.fn() },
    employee: { findUnique: vi.fn() },
  }
  return { capturedConfig, mockDb }
})

vi.mock('next-auth', () => ({
  default: (config: unknown) => {
    capturedConfig.current = config
    return { auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), handlers: {} }
  },
}))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ ok: true })),
  resetRateLimit: vi.fn(),
}))
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn() }, compare: vi.fn() }))
vi.mock('@/lib/env', () => ({ env: { AUTH_SECRET: 'test-secret' } }))

import '@/lib/auth'

function jwtCallback() {
  return (capturedConfig.current as any).callbacks.jwt as (args: {
    token: Record<string, unknown>
    user?: unknown
  }) => Promise<unknown>
}

describe('jwt callback revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when the user is deactivated', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ isActive: false, tokenVersion: 1 })
    const result = await jwtCallback()({
      token: { id: 'u1', tokenVersion: 1 },
    })
    expect(result).toBeNull()
  })

  it('returns null when the token version does not match', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ isActive: true, tokenVersion: 2 })
    const result = await jwtCallback()({
      token: { id: 'u1', tokenVersion: 1 },
    })
    expect(result).toBeNull()
  })

  it('returns the token when active and versions match', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ isActive: true, tokenVersion: 3 })
    const token = { id: 'u1', tokenVersion: 3 }
    const result = await jwtCallback()({ token })
    expect(result).toBe(token)
  })

  it('fails closed (null) when the database check throws', async () => {
    mockDb.user.findUnique.mockRejectedValueOnce(new Error('db down'))
    const result = await jwtCallback()({
      token: { id: 'u1', tokenVersion: 1 },
    })
    expect(result).toBeNull()
  })
})
