import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    payrollPeriod: {},
    attendanceRecord: {},
    leaveRequest: {},
    leaveType: {},
    payslip: {},
    employee: {},
  },
}))

import {
  getPayrollTrend,
  getWeeklyAttendance,
  getLeaveDistribution,
  getPayrollKpi,
} from '@/lib/queries/dashboard'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = (await import('@/lib/db')).db as unknown as {
  payrollPeriod: any
  attendanceRecord: any
  leaveRequest: any
  leaveType: any
  payslip: any
  employee: any
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPayrollTrend', () => {
  it('returns [] when no periods', async () => {
    db.payrollPeriod.findMany = vi.fn().mockResolvedValue([])
    const result = await getPayrollTrend()
    expect(result).toEqual([])
    expect(db.payrollPeriod.findMany).toHaveBeenCalledWith({
      include: { payslips: { select: { netPay: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6,
    })
  })

  it('groups, sorts ascending and caps at last 6', async () => {
    // descending order as returned by query
    db.payrollPeriod.findMany = vi.fn().mockResolvedValue([
      { year: 2026, month: 8, payslips: [{ netPay: 100 }, { netPay: 50 }] },
      { year: 2026, month: 7, payslips: [{ netPay: 200.5 }] },
      { year: 2026, month: 6, payslips: [] },
    ])
    const result = await getPayrollTrend()
    expect(result).toEqual([
      { monthKey: '2026-06', total: 0 },
      { monthKey: '2026-07', total: 200.5 },
      { monthKey: '2026-08', total: 150 },
    ])
  })

  it('caps at 6 entries', async () => {
    const periods = [1, 2, 3, 4, 5, 6, 7].map((m) => ({
      year: 2025,
      month: m,
      payslips: [{ netPay: m }],
    }))
    db.payrollPeriod.findMany = vi
      .fn()
      .mockResolvedValue(periods.slice().reverse())
    const result = await getPayrollTrend()
    expect(result).toHaveLength(6)
    expect(result[0].monthKey).toBe('2025-02')
    expect(result[5].monthKey).toBe('2025-07')
  })
})

describe('getWeeklyAttendance', () => {
  it('counts per day SUN..THU and derives absent', async () => {
    // fake dates within the current UAE week; implementation maps by actual date
    const now = new Date(Date.now() + 4 * 3600 * 1000)
    const sunday = new Date(now)
    sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay())
    const d = (dayOffset: number) => {
      const x = new Date(sunday)
      x.setUTCDate(x.getUTCDate() + dayOffset)
      return x
    }
    db.attendanceRecord.findMany = vi.fn().mockResolvedValue([
      { date: d(0), status: 'PRESENT' },
      { date: d(0), status: 'LATE' },
      { date: d(1), status: 'PRESENT' },
      { date: d(1), status: 'PRESENT' },
      { date: d(2), status: 'HALF_DAY' },
      { date: d(4), status: 'LATE' },
    ])

    const result = await getWeeklyAttendance(10)
    expect(result).toHaveLength(5)
    expect(result.map((r) => r.day)).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU'])
    expect(result[0]).toEqual({ day: 'SUN', present: 1, late: 1, absent: 8 })
    expect(result[1]).toEqual({ day: 'MON', present: 2, late: 0, absent: 8 })
    // HALF_DAY not counted present → absent derived
    expect(result[2]).toEqual({ day: 'TUE', present: 0, late: 0, absent: 10 })
    expect(result[4]).toEqual({ day: 'THU', present: 0, late: 1, absent: 9 })
    // never negative
  })

  it('never returns negative absent', async () => {
    const now = new Date(Date.now() + 4 * 3600 * 1000)
    const sunday = new Date(now)
    sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay())
    const many = Array.from({ length: 15 }, () => ({
      date: new Date(sunday),
      status: 'PRESENT',
    }))
    db.attendanceRecord.findMany = vi.fn().mockResolvedValue(many)
    const result = await getWeeklyAttendance(10)
    expect(result[0].absent).toBe(0)
  })
})

describe('getLeaveDistribution', () => {
  it('returns [] for empty input', async () => {
    db.leaveRequest.groupBy = vi.fn().mockResolvedValue([])
    db.leaveType.findMany = vi.fn()
    const result = await getLeaveDistribution(2026)
    expect(result).toEqual([])
    expect(db.leaveRequest.groupBy).toHaveBeenCalledWith({
      by: ['leaveTypeId'],
      where: {
        status: 'APPROVED',
        startDate: { gte: expect.any(Date), lte: expect.any(Date) },
      },
      _sum: { durationDays: true },
    })
  })

  it('sorts desc, top 5 plus Other', async () => {
    db.leaveRequest.groupBy = vi.fn().mockResolvedValue([
      { leaveTypeId: 'a', _sum: { durationDays: 12 } },
      { leaveTypeId: 'b', _sum: { durationDays: 9.4 } },
      { leaveTypeId: 'c', _sum: { durationDays: 8 } },
      { leaveTypeId: 'd', _sum: { durationDays: 5.6 } },
      { leaveTypeId: 'e', _sum: { durationDays: 3 } },
      { leaveTypeId: 'f', _sum: { durationDays: 2 } },
      { leaveTypeId: 'g', _sum: { durationDays: 1 } },
    ])
    db.leaveType.findMany = vi.fn().mockResolvedValue([
      { id: 'a', name: 'Annual' },
      { id: 'b', name: 'Sick' },
      { id: 'c', name: 'Unpaid' },
      { id: 'd', name: 'Maternity' },
      { id: 'e', name: 'Hajj' },
      { id: 'f', name: 'Emergency' },
      { id: 'g', name: 'Study' },
    ])
    const result = await getLeaveDistribution(2026)
    expect(result).toEqual([
      { name: 'Annual', value: 12 },
      { name: 'Sick', value: 9 },
      { name: 'Unpaid', value: 8 },
      { name: 'Maternity', value: 6 },
      { name: 'Hajj', value: 3 },
      { name: 'Other', value: 3 },
    ])
  })
})

describe('getPayrollKpi', () => {
  it('uses period payslips when current-month period exists', async () => {
    db.payrollPeriod.findFirst = vi.fn().mockResolvedValue({ id: 'p1' })
    db.payslip.aggregate = vi.fn().mockResolvedValue({ _sum: { netPay: 1234.56 } })
    const result = await getPayrollKpi()
    expect(result).toEqual({ total: 1234.56, source: 'period' })
  })

  it('falls back to active salaries', async () => {
    db.payrollPeriod.findFirst = vi.fn().mockResolvedValue(null)
    db.employee.aggregate = vi
      .fn()
      .mockResolvedValue({ _sum: { salary: 5000 } })
    const result = await getPayrollKpi()
    expect(result).toEqual({ total: 5000, source: 'salaries' })
  })
})
