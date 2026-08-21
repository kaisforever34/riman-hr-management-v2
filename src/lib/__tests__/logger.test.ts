import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger } from '@/lib/logger'

describe('logger', () => {
  afterEach(() => vi.restoreAllMocks())

  it('error writes to stderr with level and message', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    logger.error('db failed', { code: 'P2002' })
    expect(spy).toHaveBeenCalled()
    const out = JSON.parse(String(vi.mocked(spy).mock.calls[0][0]))
    expect(out.level).toBe('error')
    expect(out.msg).toBe('db failed')
    expect(out.code).toBe('P2002')
    expect(out.time).toBeDefined()
  })

  it('info writes to stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    logger.info('started')
    expect(spy).toHaveBeenCalled()
  })
})
