import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSession, mockRevalidatePath, mockRedirect, mockDb } = vi.hoisted(() => {
  const session = { user: { id: 'mgr1', role: 'MANAGER' } }
  const revalidate = vi.fn()
  const redirect = vi.fn()
  const db = {
    $transaction: vi.fn(),
    leaveRequest: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    leaveBalance: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    leaveType: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    employee: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn(), create: vi.fn() },
    payrollPeriod: { findUnique: vi.fn() },
    payslip: { findMany: vi.fn(), update: vi.fn() },
    attendanceRecord: { groupBy: vi.fn() },
    appSetting: { findUnique: vi.fn() },
  }
  return { mockSession: session, mockRevalidatePath: revalidate, mockRedirect: redirect, mockDb: db }
})

vi.mock('@/lib/auth', () => ({ auth: () => Promise.resolve(mockSession) }))
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args) }))
vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args) }))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/lib/upload', () => ({ uploadLeaveAttachment: () => Promise.resolve('/uploads/leaves/x.pdf') }))

import { approveLeave, cancelLeave } from '@/lib/actions/leave'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(data)) fd.set(k, v)
  return fd
}

const pendingRequest = {
  id: 'req1',
  employeeId: 'emp1',
  leaveTypeId: 'lt1',
  startDate: new Date('2026-09-01'),
  endDate: new Date('2026-09-03'),
  durationDays: 3,
  status: 'PENDING',
  employee: { id: 'emp1', userId: 'u1', hireDate: new Date('2020-01-01') },
  leaveType: { id: 'lt1', name: 'Annual' },
}

describe('approveLeave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.user.role = 'MANAGER'
  })

  it('rejects unauthenticated', async () => {
    const original = mockSession.user
    ;(mockSession as unknown as { user: null }).user = null
    const result = await approveLeave(makeFormData({ id: 'req1' }))
    expect(result?.error).toBe('Unauthorized')
    mockSession.user = original
  })

  it('rejects non-manager role', async () => {
    mockSession.user.role = 'EMPLOYEE'
    const result = await approveLeave(makeFormData({ id: 'req1' }))
    expect(result?.error).toBe('Unauthorized')
  })

  it('rejects already processed request', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValueOnce({ ...pendingRequest, status: 'APPROVED' })
    const result = await approveLeave(makeFormData({ id: 'req1' }))
    expect(result?.error).toBe('Request not found or already processed')
  })

  it('rejects when balance insufficient', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValueOnce(pendingRequest)
    mockDb.$transaction.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      const t = {
        leaveBalance: { findUnique: vi.fn().mockResolvedValue({ id: 'bal1', allocated: 30, carriedOver: 0, used: 29 }) },
        leaveType: { findUniqueOrThrow: vi.fn() },
        leaveRequest: { updateMany: vi.fn() },
      }
      await fn(t)
    })
    const result = await approveLeave(makeFormData({ id: 'req1' }))
    expect(result?.error).toContain('enough leave balance')
  })

  it('approves and increments balance atomically', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValueOnce(pendingRequest)
    mockDb.leaveBalance.findUnique.mockResolvedValueOnce({
      id: 'bal1', allocated: 30, carriedOver: 0, used: 5,
      yearStart: new Date('2026-01-01'), yearEnd: new Date('2026-12-31'),
    })
    mockDb.$transaction.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      const t = {
        leaveRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        leaveBalance: {
          findUnique: vi.fn().mockResolvedValue({ id: 'bal1', allocated: 30, carriedOver: 0, used: 5 }),
          update: vi.fn().mockResolvedValue({}),
        },
      }
      await fn(t)
      expect(t.leaveRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'req1', status: 'PENDING' } }),
      )
      expect(t.leaveBalance.update).toHaveBeenCalledWith({
        where: { id: 'bal1' },
        data: { used: { increment: 3 } },
      })
    })
    mockDb.employee.findUnique.mockResolvedValueOnce({ id: 'emp1', user: { id: 'u1' } })
    mockDb.notification.createMany.mockResolvedValue({})

    await approveLeave(makeFormData({ id: 'req1' }))
    expect(mockDb.$transaction).toHaveBeenCalled()
  })
})

describe('cancelLeave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.user.role = 'EMPLOYEE'
    mockSession.user.id = 'u1'
  })

  it('employee cannot cancel approved request', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValueOnce({ ...pendingRequest, status: 'APPROVED' })
    const result = await cancelLeave(makeFormData({ id: 'req1' }))
    expect(result?.error).toBe('Cannot cancel a processed request')
  })

  it('cancelling approved request decrements balance using leave dates', async () => {
    mockSession.user.role = 'MANAGER'
    mockDb.leaveRequest.findUnique.mockResolvedValueOnce({ ...pendingRequest, status: 'APPROVED' })
    mockDb.$transaction.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      const t = {
        leaveRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        leaveBalance: { findFirst: vi.fn().mockResolvedValue({ id: 'bal1' }), update: vi.fn().mockResolvedValue({}) },
      }
      await fn(t)
      expect(t.leaveBalance.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          yearStart: { lte: pendingRequest.startDate },
          yearEnd: { gte: pendingRequest.startDate },
        }),
      })
      expect(t.leaveBalance.update).toHaveBeenCalledWith({
        where: { id: 'bal1' },
        data: { used: { decrement: 3 } },
      })
    })

    await cancelLeave(makeFormData({ id: 'req1' }))
    expect(mockDb.$transaction).toHaveBeenCalled()
  })
})
