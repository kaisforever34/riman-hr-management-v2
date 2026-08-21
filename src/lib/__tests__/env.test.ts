import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('throws when DATABASE_URL missing', async () => {
    vi.stubEnv('DATABASE_URL', '')
    await expect(import('@/lib/env')).rejects.toThrow()
  })

  it('throws when AUTH_SECRET missing in production', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://x')
    vi.stubEnv('AUTH_SECRET', '')
    vi.stubEnv('NODE_ENV', 'production')
    await expect(import('@/lib/env')).rejects.toThrow('AUTH_SECRET')
  })

  it('exports validated env when all present', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://x')
    vi.stubEnv('AUTH_SECRET', 'secret-123')
    const { env } = await import('@/lib/env')
    expect(env.DATABASE_URL).toBe('postgresql://x')
    expect(env.AUTH_SECRET).toBe('secret-123')
  })
})
