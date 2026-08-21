// src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits())

  it('allows first attempts', () => {
    expect(checkRateLimit('ip1').ok).toBe(true)
  })

  it('blocks after 5 attempts', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('ip2')
    const result = checkRateLimit('ip2')
    expect(result.ok).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })

  it('tracks keys independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('ip3')
    expect(checkRateLimit('ip4').ok).toBe(true)
  })
})
