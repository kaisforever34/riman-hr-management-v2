// src/lib/__tests__/email.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockResend } = vi.hoisted(() => ({ mockResend: { emails: { send: vi.fn() } } }))
vi.mock('resend', () => ({ Resend: class { constructor() { return mockResend } } }))
vi.mock('@/lib/db', () => ({ db: { appSetting: { findUnique: vi.fn().mockResolvedValue(null) } } }))

import { sendEmail, renderEmail } from '@/lib/email'

describe('sendEmail', () => {
  beforeEach(() => { mockResend.emails.send.mockReset(); process.env.RESEND_API_KEY = 'test-key' })

  it('sends via resend and returns true', async () => {
    mockResend.emails.send.mockResolvedValueOnce({ data: { id: '1' } })
    const ok = await sendEmail({ to: 'a@b.c', subject: 'S', html: '<p>x</p>' })
    expect(ok).toBe(true)
    expect(mockResend.emails.send).toHaveBeenCalledOnce()
  })

  it('returns false when resend errors', async () => {
    mockResend.emails.send.mockRejectedValueOnce(new Error('down'))
    expect(await sendEmail({ to: 'a@b.c', subject: 'S', html: 'x' })).toBe(false)
  })

  it('logs instead of sending when no API key', async () => {
    delete process.env.RESEND_API_KEY
    const ok = await sendEmail({ to: 'a@b.c', subject: 'S', html: 'x' })
    expect(ok).toBe(true)
    expect(mockResend.emails.send).not.toHaveBeenCalled()
  })
})

describe('renderEmail', () => {
  it('wraps title and lines in html', async () => {
    const html = await renderEmail('Title', ['line one', 'line two'])
    expect(html).toContain('Title')
    expect(html).toContain('line one')
  })
})
