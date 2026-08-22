import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSession, mockRevalidatePath, mockDb } = vi.hoisted(() => {
  const session = { user: { id: 'admin1', role: 'HR_ADMIN' } }
  const revalidate = vi.fn()
  const db = {
    holiday: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  }
  return { mockSession: session, mockRevalidatePath: revalidate, mockDb: db }
})

vi.mock('@/lib/auth', () => ({ auth: () => Promise.resolve(mockSession) }))
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args) }))
vi.mock('@/lib/db', () => ({ db: mockDb }))

import { createHoliday, updateHoliday, deleteHoliday } from '@/lib/actions/holiday'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(data)) fd.set(k, v)
  return fd
}

describe('holiday actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.user.role = 'HR_ADMIN'
  })

  describe('createHoliday', () => {
    it('rejects non-HR_ADMIN', async () => {
      mockSession.user.role = 'MANAGER'
      const result = await createHoliday(makeFormData({ name: 'Eid', date: '2026-03-20' }))
      expect(result?.error).toBe('You are not authorized to perform this action.')
      expect(mockDb.holiday.create).not.toHaveBeenCalled()
    })

    it('returns validation error for missing fields', async () => {
      const result = await createHoliday(makeFormData({}))
      expect(result?.error).toBeDefined()
      expect(mockDb.holiday.create).not.toHaveBeenCalled()
    })

    it('creates holiday with optional Arabic name', async () => {
      mockDb.holiday.create.mockResolvedValueOnce({})
      const result = await createHoliday(makeFormData({ name: 'Eid Al Fitr', date: '2026-03-20' }))
      expect(result).toBeUndefined()
      expect(mockDb.holiday.create).toHaveBeenCalledWith({
        data: { name: 'Eid Al Fitr', nameAr: null, date: new Date('2026-03-20') },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/manager/holidays')
    })

    it('maps unique constraint violation to invalidRequest', async () => {
      mockDb.holiday.create.mockRejectedValueOnce({ code: 'P2002' })
      const result = await createHoliday(makeFormData({ name: 'Duplicate', date: '2026-03-20' }))
      expect(result?.error).toBe('Invalid request')
      expect(result?.fieldErrors).toEqual({})
    })
  })

  describe('updateHoliday', () => {
    it('rejects non-HR_ADMIN', async () => {
      mockSession.user.role = 'EMPLOYEE'
      const form = makeFormData({ id: 'h1', name: 'Eid', date: '2026-03-21' })
      const result = await updateHoliday(form)
      expect(result?.error).toBe('You are not authorized to perform this action.')
      expect(mockDb.holiday.update).not.toHaveBeenCalled()
    })

    it('returns validation error for missing fields', async () => {
      const result = await updateHoliday(makeFormData({ id: 'h1' }))
      expect(result?.error).toBe('Validation failed')
      expect(mockDb.holiday.update).not.toHaveBeenCalled()
    })

    it('updates holiday and revalidates', async () => {
      mockDb.holiday.update.mockResolvedValueOnce({})
      const result = await updateHoliday(
        makeFormData({ id: 'h1', name: 'Eid Al Adha', nameAr: 'عيد الأضحى', date: '2026-05-27' }),
      )
      expect(result).toBeUndefined()
      expect(mockDb.holiday.update).toHaveBeenCalledWith({
        where: { id: 'h1' },
        data: { name: 'Eid Al Adha', nameAr: 'عيد الأضحى', date: new Date('2026-05-27') },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/manager/holidays')
    })

    it('maps unique constraint violation to invalidRequest', async () => {
      mockDb.holiday.update.mockRejectedValueOnce({ code: 'P2002' })
      const result = await updateHoliday(
        makeFormData({ id: 'h1', name: 'Clash', date: '2026-12-01' }),
      )
      expect(result?.error).toBe('Invalid request')
      expect(result?.fieldErrors).toEqual({})
    })

    it('rethrows unexpected errors', async () => {
      mockDb.holiday.update.mockRejectedValueOnce(new Error('boom'))
      await expect(
        updateHoliday(makeFormData({ id: 'h1', name: 'X', date: '2026-12-01' })),
      ).rejects.toThrow('boom')
    })
  })

  describe('deleteHoliday', () => {
    it('deletes by id', async () => {
      mockDb.holiday.delete.mockResolvedValueOnce({})
      const result = await deleteHoliday(makeFormData({ id: 'h1' }))
      expect(result).toBeUndefined()
      expect(mockDb.holiday.delete).toHaveBeenCalledWith({ where: { id: 'h1' } })
    })
  })
})
