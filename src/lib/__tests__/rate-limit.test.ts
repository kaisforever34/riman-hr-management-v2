// src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  resetRateLimits,
} from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits())

  it('allows first attempts', () => {
    expect(checkRateLimit('ip1').ok).toBe(true)
  })

  it('does not consume quota on successful checks', () => {
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit('ip-ok').ok).toBe(true)
    }
  })

  it('blocks after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('ip2')
    const result = checkRateLimit('ip2')
    expect(result.ok).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })

  it('tracks keys independently', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('ip3')
    expect(checkRateLimit('ip4').ok).toBe(true)
  })

  it('resetRateLimit allows attempts again after block', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('ip5')
    expect(checkRateLimit('ip5').ok).toBe(false)
    resetRateLimit('ip5')
    expect(checkRateLimit('ip5').ok).toBe(true)
  })
})
