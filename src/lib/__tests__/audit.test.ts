import { describe, it, expect, vi } from 'vitest'

const { mockDb, mockLogger } = vi.hoisted(() => ({
  mockDb: { auditLog: { create: vi.fn() } },
  mockLogger: { error: vi.fn() },
}))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/lib/logger', () => ({ logger: mockLogger }))

import { logAudit } from '@/lib/audit'

describe('logAudit', () => {
  it('writes an audit row', async () => {
    mockDb.auditLog.create.mockResolvedValueOnce({})
    await logAudit({ actorId: 'u1', actorEmail: 'a@b.c', action: 'LEAVE_APPROVED', entityType: 'LeaveRequest', entityId: 'r1' })
    expect(mockDb.auditLog.create).toHaveBeenCalledOnce()
  })

  it('swallows database errors', async () => {
    mockDb.auditLog.create.mockRejectedValueOnce(new Error('down'))
    await expect(logAudit({ action: 'X', entityType: 'Y' })).resolves.toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
