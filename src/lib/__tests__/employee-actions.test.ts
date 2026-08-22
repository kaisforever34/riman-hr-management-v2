import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSession, mockRevalidatePath, mockDb } = vi.hoisted(() => {
  const session = { user: { id: 'admin1', email: 'admin@x.io', role: 'HR_ADMIN' } }
  const revalidate = vi.fn()
  const db = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    employee: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
    auditLog: { create: vi.fn() },
  }
  return { mockSession: session, mockRevalidatePath: revalidate, mockDb: db }
})

vi.mock('@/lib/auth', () => ({ auth: () => Promise.resolve(mockSession) }))
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args) }))
vi.mock('@/lib/db', () => ({ db: mockDb }))

import { deactivateEmployee } from '@/lib/actions/employee'

function form(userId?: string) {
  const fd = new FormData()
  if (userId) fd.set('userId', userId)
  return fd
}

describe('deactivateEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.user = { id: 'admin1', email: 'admin@x.io', role: 'HR_ADMIN' }
    mockDb.user.findUnique.mockResolvedValue({
      id: 'target1',
      employee: { id: 'emp1' },
    })
    mockDb.user.update.mockResolvedValue({})
    mockDb.employee.update.mockResolvedValue({})
    mockDb.$transaction.mockResolvedValue([])
  })

  it('rejects non-admin callers', async () => {
    mockSession.user.role = 'MANAGER'
    const result = await deactivateEmployee(form('target1'))
    expect(result?.error).toBe('You are not authorized to perform this action.')
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('rejects self-deactivation', async () => {
    const result = await deactivateEmployee(form('admin1'))
    expect(result?.error).toBe('Invalid request')
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('returns error when target user does not exist', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(null)
    const result = await deactivateEmployee(form('missing'))
    expect(result?.error).toBe('Employee not found')
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('deactivates user and employee inside a transaction and increments tokenVersion', async () => {
    await deactivateEmployee(form('target1'))

    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'target1' },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    })
    expect(mockDb.employee.update).toHaveBeenCalledWith({
      where: { id: 'emp1' },
      data: { isActive: false },
    })
    expect(mockDb.$transaction).toHaveBeenCalledOnce()
    const ops = mockDb.$transaction.mock.calls[0][0] as unknown[]
    expect(ops).toHaveLength(2)
    expect(mockDb.auditLog.create).toHaveBeenCalledOnce()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/employees')
  })

  it('updates only the user when no employee record exists', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ id: 'target1', employee: null })
    await deactivateEmployee(form('target1'))

    expect(mockDb.user.update).toHaveBeenCalledOnce()
    expect(mockDb.employee.update).not.toHaveBeenCalled()
    const ops = mockDb.$transaction.mock.calls[0][0] as unknown[]
    expect(ops).toHaveLength(1)
  })
})
