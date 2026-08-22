import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSession, mockDb, mockReadFile } = vi.hoisted(() => {
  const session = { user: { id: 'user1', role: 'EMPLOYEE' } }
  const db = {
    employeeDocument: { findUnique: vi.fn() },
    companyDocument: { findUnique: vi.fn() },
    leaveRequest: { findUnique: vi.fn() },
  }
  const readFile = vi.fn()
  return { mockSession: session, mockDb: db, mockReadFile: readFile }
})

vi.mock('@/lib/auth', () => ({ auth: () => Promise.resolve(mockSession) }))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('fs/promises', () => {
  const readFile = (...args: unknown[]) => mockReadFile(...args)
  return { readFile, default: { readFile } }
})
vi.mock('@/lib/upload', () => ({ PRIVATE_UPLOAD_ROOT: '/abs/private-uploads' }))

import { GET as getDocument } from '@/app/api/documents/[id]/route'
import { GET as getLeaveDocument } from '@/app/api/documents/leave/[id]/route'

function req(type?: string) {
  const url = new URL(`http://localhost/api/documents/doc1${type ? `?type=${type}` : ''}`)
  return { nextUrl: new URL(url) } as never
}

const params = Promise.resolve({ id: 'doc1' })

beforeEach(() => {
  vi.clearAllMocks()
  mockSession.user = { id: 'user1', role: 'EMPLOYEE' }
  mockReadFile.mockResolvedValue(Buffer.from('file-content'))
})

describe('GET /api/documents/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    // @ts-expect-error test
    mockSession.user = null
    const res = await getDocument(req(), { params })
    expect(res.status).toBe(401)
  })

  it('employee downloads own EmployeeDocument', async () => {
    mockDb.employeeDocument.findUnique.mockResolvedValue({
      fileName: 'a.pdf',
      filePath: 'documents/employees/a.pdf',
      fileType: 'application/pdf',
      employee: { userId: 'user1' },
    })
    const res = await getDocument(req(), { params })
    expect(res.status).toBe(200)
  })

  it('employee cannot download other employee document', async () => {
    mockDb.employeeDocument.findUnique.mockResolvedValue({
      fileName: 'a.pdf',
      filePath: 'documents/employees/a.pdf',
      fileType: 'application/pdf',
      employee: { userId: 'other' },
    })
    const res = await getDocument(req(), { params })
    expect(res.status).toBe(403)
  })

  it('manager downloads any EmployeeDocument', async () => {
    mockSession.user = { id: 'mgr1', role: 'MANAGER' }
    mockDb.employeeDocument.findUnique.mockResolvedValue({
      fileName: 'a.pdf',
      filePath: 'documents/employees/a.pdf',
      fileType: 'application/pdf',
      employee: { userId: 'other' },
    })
    const res = await getDocument(req(), { params })
    expect(res.status).toBe(200)
  })

  it('HR_ADMIN downloads any EmployeeDocument', async () => {
    mockSession.user = { id: 'admin1', role: 'HR_ADMIN' }
    mockDb.employeeDocument.findUnique.mockResolvedValue({
      fileName: 'a.pdf',
      filePath: 'documents/employees/a.pdf',
      fileType: 'application/pdf',
      employee: { userId: 'other' },
    })
    const res = await getDocument(req(), { params })
    expect(res.status).toBe(200)
  })

  it('returns 401 for zombie session without user id (revoked token)', async () => {
    // @ts-expect-error test
    mockSession.user = { id: undefined, role: undefined }
    const res = await getDocument(req('company'), { params })
    expect(res.status).toBe(401)
  })

  it('any authenticated user downloads CompanyDocument', async () => {
    mockDb.companyDocument.findUnique.mockResolvedValue({
      fileName: 'c.pdf',
      filePath: 'documents/company/c.pdf',
      fileType: 'application/pdf',
    })
    const res = await getDocument(req('company'), { params })
    expect(res.status).toBe(200)
  })

  it('returns 404 when record missing', async () => {
    mockDb.employeeDocument.findUnique.mockResolvedValue(null)
    const res = await getDocument(req(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 403 when filePath resolves outside upload root', async () => {
    mockDb.employeeDocument.findUnique.mockResolvedValue({
      fileName: 'evil.pdf',
      filePath: '../secrets/a.pdf',
      fileType: 'application/pdf',
      employee: { userId: 'user1' },
    })
    const res = await getDocument(req(), { params })
    expect(res.status).toBe(403)
  })

  it('handles legacy /uploads/ paths', async () => {
    mockDb.employeeDocument.findUnique.mockResolvedValue({
      fileName: 'old.pdf',
      filePath: '/uploads/documents/employees/old.pdf',
      fileType: 'application/pdf',
      employee: { userId: 'user1' },
    })
    const res = await getDocument(req(), { params })
    expect(res.status).toBe(200)
  })
})

describe('GET /api/documents/leave/[id]', () => {
  const leaveParams = Promise.resolve({ id: 'leave1' })

  function leaveReq() {
    return { nextUrl: new URL('http://localhost/api/documents/leave/leave1') } as never
  }

  it('returns 401 when unauthenticated', async () => {
    // @ts-expect-error test
    mockSession.user = null
    const res = await getLeaveDocument(leaveReq(), { params: leaveParams })
    expect(res.status).toBe(401)
  })

  it('owner downloads own leave attachment', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValue({
      attachmentFile: 'leaves/x.pdf',
      employee: { userId: 'user1' },
    })
    const res = await getLeaveDocument(leaveReq(), { params: leaveParams })
    expect(res.status).toBe(200)
  })

  it('employee cannot download other leave attachment', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValue({
      attachmentFile: 'leaves/x.pdf',
      employee: { userId: 'other' },
    })
    const res = await getLeaveDocument(leaveReq(), { params: leaveParams })
    expect(res.status).toBe(403)
  })

  it('manager downloads any leave attachment', async () => {
    mockSession.user = { id: 'mgr1', role: 'HR_ADMIN' }
    mockDb.leaveRequest.findUnique.mockResolvedValue({
      attachmentFile: 'leaves/x.pdf',
      employee: { userId: 'other' },
    })
    const res = await getLeaveDocument(leaveReq(), { params: leaveParams })
    expect(res.status).toBe(200)
  })

  it('returns 404 when missing or no attachment', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValue(null)
    expect((await getLeaveDocument(leaveReq(), { params: leaveParams })).status).toBe(404)
    mockDb.leaveRequest.findUnique.mockResolvedValue({
      attachmentFile: null,
      employee: { userId: 'user1' },
    })
    expect((await getLeaveDocument(leaveReq(), { params: leaveParams })).status).toBe(404)
  })

  it('returns 403 on path-traversal attachment key', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValue({
      attachmentFile: '../secrets/a.pdf',
      employee: { userId: 'user1' },
    })
    const res = await getLeaveDocument(leaveReq(), { params: leaveParams })
    expect(res.status).toBe(403)
  })

  it('handles legacy /uploads/-prefixed attachment key', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValue({
      attachmentFile: '/uploads/leaves/old.pdf',
      employee: { userId: 'user1' },
    })
    const res = await getLeaveDocument(leaveReq(), { params: leaveParams })
    expect(res.status).toBe(200)
  })

  it('returns 401 for zombie session without user id (revoked token)', async () => {
    // @ts-expect-error test
    mockSession.user = { id: undefined, role: undefined }
    const res = await getLeaveDocument(leaveReq(), { params: leaveParams })
    expect(res.status).toBe(401)
  })
})

