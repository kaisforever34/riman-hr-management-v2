import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSession, mockDb } = vi.hoisted(() => {
  const session = { user: { id: 'user1', role: 'MANAGER' } }
  const db = {
    payrollPeriod: { findUnique: vi.fn() },
    attendanceRecord: { findMany: vi.fn() },
    leaveRequest: { findMany: vi.fn() },
  }
  return { mockSession: session, mockDb: db }
})

vi.mock('@/lib/auth', () => ({ auth: () => Promise.resolve(mockSession) }))
vi.mock('@/lib/db', () => ({ db: mockDb }))

import { GET as getPayroll } from '@/app/api/export/payroll/route'
import { GET as getAttendance } from '@/app/api/export/attendance/route'
import { GET as getLeaves } from '@/app/api/export/leaves/route'

function req(url: string) {
  return { nextUrl: new URL(url) } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSession.user = { id: 'user1', role: 'MANAGER' }
})

describe('export payroll route', () => {
  it('returns 401 when unauthenticated', async () => {
    // @ts-expect-error test
    mockSession.user = null
    const res = await getPayroll(req('http://localhost/api/export/payroll?periodId=p1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for EMPLOYEE', async () => {
    mockSession.user = { id: 'user1', role: 'EMPLOYEE' }
    const res = await getPayroll(req('http://localhost/api/export/payroll?periodId=p1'))
    expect(res.status).toBe(403)
  })

  it('returns 404 when period missing', async () => {
    mockDb.payrollPeriod.findUnique.mockResolvedValue(null)
    const res = await getPayroll(req('http://localhost/api/export/payroll?periodId=missing'))
    expect(res.status).toBe(404)
  })

  it('returns CSV with BOM for MANAGER', async () => {
    mockDb.payrollPeriod.findUnique.mockResolvedValue({
      month: 3,
      year: 2026,
      payslips: [
        {
          basicSalary: 5000,
          transportationDeduction: 100,
          absenceDeduction: 0,
          lateDeduction: 50,
          netPay: 4850,
          employee: { employeeCode: 'E1', firstName: 'Ali', lastName: 'Hassan' },
        },
      ],
    })
    const res = await getPayroll(req('http://localhost/api/export/payroll?periodId=p1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toContain('attachment; filename="payroll-')
    const bytes = new Uint8Array(await res.arrayBuffer())
    const body = new TextDecoder('utf-8').decode(bytes)
    expect(bytes[0]).toBe(0xef)
    expect(bytes[1]).toBe(0xbb)
    expect(bytes[2]).toBe(0xbf)
    expect(body).toContain('E1,Ali Hassan,5000,100,0,50,4850')
  })
})

describe('export attendance route', () => {
  it('returns 401 when unauthenticated', async () => {
    // @ts-expect-error test
    mockSession.user = null
    const res = await getAttendance(req('http://localhost/api/export/attendance'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for EMPLOYEE', async () => {
    mockSession.user = { id: 'user1', role: 'EMPLOYEE' }
    const res = await getAttendance(req('http://localhost/api/export/attendance'))
    expect(res.status).toBe(403)
  })

  it('returns CSV with BOM for MANAGER', async () => {
    mockDb.attendanceRecord.findMany.mockResolvedValue([
      {
        date: new Date('2026-03-01T00:00:00Z'),
        checkIn: new Date('2026-03-01T08:00:00Z'),
        checkOut: new Date('2026-03-01T16:00:00Z'),
        status: 'PRESENT',
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        employee: { employeeCode: 'E1', firstName: 'Ali', lastName: 'Hassan' },
      },
    ])
    const res = await getAttendance(req('http://localhost/api/export/attendance'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    const bytes = new Uint8Array(await res.arrayBuffer())
    const body = new TextDecoder('utf-8').decode(bytes)
    expect(bytes[0]).toBe(0xef)
    expect(bytes[1]).toBe(0xbb)
    expect(bytes[2]).toBe(0xbf)
    expect(body).toContain('E1,Ali Hassan,2026-03-01')
  })
})

describe('export leaves route', () => {
  it('returns 401 when unauthenticated', async () => {
    // @ts-expect-error test
    mockSession.user = null
    const res = await getLeaves(req('http://localhost/api/export/leaves'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for EMPLOYEE', async () => {
    mockSession.user = { id: 'user1', role: 'EMPLOYEE' }
    const res = await getLeaves(req('http://localhost/api/export/leaves'))
    expect(res.status).toBe(403)
  })

  it('returns CSV with BOM for MANAGER', async () => {
    mockDb.leaveRequest.findMany.mockResolvedValue([
      {
        startDate: new Date('2026-03-01T00:00:00Z'),
        endDate: new Date('2026-03-03T00:00:00Z'),
        durationDays: 3,
        status: 'APPROVED',
        reason: 'Vacation',
        employee: { employeeCode: 'E1', firstName: 'Ali', lastName: 'Hassan' },
        leaveType: { name: 'Annual' },
      },
    ])
    const res = await getLeaves(req('http://localhost/api/export/leaves?year=2026'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    const bytes = new Uint8Array(await res.arrayBuffer())
    const body = new TextDecoder('utf-8').decode(bytes)
    expect(bytes[0]).toBe(0xef)
    expect(bytes[1]).toBe(0xbb)
    expect(bytes[2]).toBe(0xbf)
    expect(body).toContain('E1,Ali Hassan,Annual,2026-03-01,2026-03-03,3,APPROVED,Vacation')
  })
})
