import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSession, mockRevalidatePath, mockDb } = vi.hoisted(() => {
  const session = { user: { id: 'user1', role: 'MANAGER' } }
  const revalidate = vi.fn()
  const db = {
    employeeDocument: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    companyDocument: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    performanceReview: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
  }
  return { mockSession: session, mockRevalidatePath: revalidate, mockDb: db }
})

vi.mock('@/lib/auth', () => ({ auth: () => Promise.resolve(mockSession) }))
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args) }))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/lib/document-upload', () => ({ uploadDocument: () => Promise.resolve('documents/employees/test.pdf') }))
vi.mock('fs/promises', async () => ({ default: { unlink: () => Promise.resolve() }, unlink: () => Promise.resolve() }))

import { uploadEmployeeDoc, uploadCompanyDoc, deleteDocument } from '@/lib/actions/document'
import { createReview, deleteReview } from '@/lib/actions/performance'

function makeFormData(data: Record<string, string | Blob>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      fd.set(key, value)
    } else {
      fd.set(key, value, 'test.pdf')
    }
  }
  return fd
}

describe('document actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadEmployeeDoc', () => {
    it('returns unauthorized for non-manager', async () => {
      const original = mockSession.user.role
      mockSession.user.role = 'EMPLOYEE'
      const result = await uploadEmployeeDoc(new FormData())
      expect(result?.error).toBe('You are not authorized to perform this action.')
      mockSession.user.role = original
    })

    it('returns error when file is missing', async () => {
      const form = makeFormData({ employeeId: 'e1', category: 'CONTRACT' })
      const result = await uploadEmployeeDoc(form)
      expect(result?.error).toBe('File is required')
    })

    it('creates document on valid input', async () => {
      mockDb.employeeDocument.create.mockResolvedValueOnce({ id: 'doc1' })
      const file = new File(['dummy'], 'contract.pdf', { type: 'application/pdf' })
      const form = makeFormData({ employeeId: 'e1', category: 'CONTRACT' })
      form.set('file', file, 'contract.pdf')
      const result = await uploadEmployeeDoc(form)
      expect(result).toBeUndefined()
      expect(mockDb.employeeDocument.create).toHaveBeenCalledOnce()
      expect(mockRevalidatePath).toHaveBeenCalledWith('/manager/documents')
    })
  })

  describe('uploadCompanyDoc', () => {
    it('creates company document', async () => {
      mockDb.companyDocument.create.mockResolvedValueOnce({ id: 'doc1' })
      const file = new File(['dummy'], 'policy.pdf', { type: 'application/pdf' })
      const form = makeFormData({ category: 'POLICY', title: 'Code of Conduct' })
      form.set('file', file, 'policy.pdf')
      const result = await uploadCompanyDoc(form)
      expect(result).toBeUndefined()
      expect(mockDb.companyDocument.create).toHaveBeenCalledOnce()
    })
  })

  describe('deleteDocument', () => {
    it('deletes employee document', async () => {
      mockDb.employeeDocument.findUnique.mockResolvedValueOnce({ id: 'd1', filePath: '/uploads/test.pdf' })
      mockDb.employeeDocument.delete.mockResolvedValueOnce({})
      const form = makeFormData({ id: 'd1', type: 'employee' })
      const result = await deleteDocument(form)
      expect(result).toBeUndefined()
      expect(mockDb.employeeDocument.delete).toHaveBeenCalledWith({ where: { id: 'd1' } })
    })

    it('returns error for missing document', async () => {
      mockDb.employeeDocument.findUnique.mockResolvedValueOnce(null)
      const form = makeFormData({ id: 'nonexistent', type: 'employee' })
      const result = await deleteDocument(form)
      expect(result?.error).toBe('Document not found')
    })
  })
})

describe('performance actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createReview', () => {
    it('creates review with ratings and goals', async () => {
      mockDb.performanceReview.findFirst.mockResolvedValueOnce(null)
      mockDb.performanceReview.create.mockResolvedValueOnce({ id: 'r1' })

      const form = makeFormData({
        employeeId: 'e1',
        year: '2024',
        quarter: '1',
        comments: 'Good work',
        ratings: JSON.stringify([{ criteriaId: 'c1', rating: 'MEETS', comment: '' }]),
        goals: JSON.stringify([{ description: 'Improve sales' }]),
      })

      const result = await createReview(form)
      expect(result).toEqual({ success: true })
      expect(mockDb.performanceReview.create).toHaveBeenCalledOnce()
      expect(mockRevalidatePath).toHaveBeenCalledWith('/manager/performance')
    })

    it('rejects duplicate review', async () => {
      mockDb.performanceReview.findFirst.mockResolvedValueOnce({ id: 'existing' })
      const form = makeFormData({
        employeeId: 'e1', year: '2024', quarter: '1',
        ratings: JSON.stringify([{ criteriaId: 'c1', rating: 'MEETS' }]),
        goals: JSON.stringify([]),
      })
      const result = await createReview(form)
      expect(result?.error).toBe('A review already exists for this employee in this period')
    })

    it('computes overall rating as EXCEEDS', async () => {
      mockDb.performanceReview.findFirst.mockResolvedValueOnce(null)
      mockDb.performanceReview.create.mockResolvedValueOnce({ id: 'r2' })

      const form = makeFormData({
        employeeId: 'e1', year: '2024', quarter: '2',
        ratings: JSON.stringify([
          { criteriaId: 'c1', rating: 'EXCEEDS' },
          { criteriaId: 'c2', rating: 'EXCEEDS' },
        ]),
        goals: JSON.stringify([]),
      })

      await createReview(form)
      const createCall = mockDb.performanceReview.create.mock.calls[0][0]
      expect(createCall.data.overallRating).toBe('EXCEEDS')
    })

    it('computes overall rating as BELOW_EXPECTATIONS', async () => {
      mockDb.performanceReview.findFirst.mockResolvedValueOnce(null)
      mockDb.performanceReview.create.mockResolvedValueOnce({ id: 'r3' })

      const form = makeFormData({
        employeeId: 'e1', year: '2024', quarter: '3',
        ratings: JSON.stringify([
          { criteriaId: 'c1', rating: 'BELOW_EXPECTATIONS' },
          { criteriaId: 'c2', rating: 'BELOW_EXPECTATIONS' },
        ]),
        goals: JSON.stringify([]),
      })

      await createReview(form)
      const createCall = mockDb.performanceReview.create.mock.calls[0][0]
      expect(createCall.data.overallRating).toBe('BELOW_EXPECTATIONS')
    })
  })

  describe('deleteReview', () => {
    it('deletes existing review', async () => {
      mockDb.performanceReview.findUnique.mockResolvedValueOnce({ id: 'r1', status: 'DRAFT' })
      mockDb.performanceReview.delete.mockResolvedValueOnce({})
      const form = makeFormData({ id: 'r1' })
      const result = await deleteReview(form)
      expect(result).toEqual({ success: true })
    })

    it('returns error for missing review', async () => {
      mockDb.performanceReview.findUnique.mockResolvedValueOnce(null)
      const form = makeFormData({ id: 'nonexistent' })
      const result = await deleteReview(form)
      expect(result?.error).toBe('Review not found')
    })
  })
})
