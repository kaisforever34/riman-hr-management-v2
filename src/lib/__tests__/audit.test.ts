import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockSession, mockDb, mockRedirect } = vi.hoisted(() => {
  const session = { user: { id: 'mgr1', email: 'mgr@x.com', role: 'MANAGER' } }
  const db = {
    $transaction: vi.fn(),
    leaveRequest: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    leaveBalance: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    leaveType: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    employee: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    notification: { createMany: vi.fn(), create: vi.fn() },
    payrollPeriod: { findUnique: vi.fn(), create: vi.fn() },
    payslip: { findMany: vi.fn(), update: vi.fn(), createMany: vi.fn(), aggregate: vi.fn() },
    attendanceRecord: { groupBy: vi.fn().mockResolvedValue([]), findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    overtimeRecord: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    eosbRecord: { create: vi.fn().mockResolvedValue({ id: 'eosb1' }) },
    appSetting: { findUnique: vi.fn() },
    holiday: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: vi.fn() },
  }
  return { mockSession: session, mockDb: db, mockRedirect: vi.fn() }
})

vi.mock('@/lib/auth', () => ({ auth: () => Promise.resolve(mockSession) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => mockRedirect(...args) }))
vi.mock('@/lib/db', () => ({ db: mockDb }))

import { countWorkingDays, isWorkingDay, toUaeDateKey } from '@/lib/working-days'
import { isWithinSchedule, getOvertimeMinutes, getEarlyLeaveMinutes } from '@/lib/schedule'
import { getOrCreateLeaveBalance } from '@/lib/queries/leave'
import { approveLeave, cancelLeave, updateLeave, submitLeave } from '@/lib/actions/leave'
import { createPayrollPeriod, finalizePayroll } from '@/lib/actions/payroll'
import { terminateEmployee, createUser } from '@/lib/actions/employee'
import { autoClockout, markAbsent } from '@/lib/actions/attendance'
import { computeEosb } from '@/lib/eosb'
import bcrypt from 'bcryptjs'

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(data)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSession.user.role = 'MANAGER'
  mockDb.appSetting.findUnique.mockResolvedValue(null)
})

describe('working-days boundaries', () => {
  const sunThu = [0, 1, 2, 3, 4]

  it('counts across year-end boundary', () => {
    // 2026-12-30 Wed, 2026-12-31 Thu, 2027-01-01 Fri, 2027-01-02 Sat
    expect(countWorkingDays('2026-12-30', '2027-01-02', sunThu, new Set())).toBe(2)
  })

  it('handles leap day 2028-02-29 (Mon/Tue/Wed span)', () => {
    expect(countWorkingDays('2028-02-28', '2028-03-01', sunThu, new Set())).toBe(3)
  })

  it('excludes holidays', () => {
    expect(countWorkingDays('2026-12-30', '2027-01-02', sunThu, new Set(['2026-12-31']))).toBe(1)
  })

  it('toUaeDateKey rolls date forward across UTC midnight', () => {
    expect(toUaeDateKey(new Date('2026-08-27T20:30:00Z'))).toBe('2026-08-28')
  })

  it('isWorkingDay uses UAE weekday', () => {
    expect(isWorkingDay('2026-09-04', sunThu, new Set())).toBe(false) // Friday
    expect(isWorkingDay('2026-09-06', sunThu, new Set())).toBe(true) // Sunday
  })
})

describe('schedule boundaries', () => {
  it('exactly at start+grace is not late', () => {
    // 07:35 UTC = 11:35 UAE = start(11:30)+grace(5)
    expect(isWithinSchedule(new Date('2026-08-27T07:35:00Z'), 5)).toEqual({ isLate: false, lateMinutes: 0 })
  })

  it('one minute past grace is late, and lateMinutes excludes the grace window', () => {
    // 07:36 UTC = 11:36 UAE -> 6 min after start, 1 past grace
    const r = isWithinSchedule(new Date('2026-08-27T07:36:00Z'), 5)
    expect(r.isLate).toBe(true)
    expect(r.lateMinutes).toBe(1) // FIXED: deducts only the 1 minute beyond grace
  })

  it('overtime at exactly shift end is 0', () => {
    expect(getOvertimeMinutes(new Date('2026-08-27T16:30:00Z'))).toBe(0) // 20:30 UAE
    expect(getOvertimeMinutes(new Date('2026-08-27T16:31:00Z'))).toBe(1)
  })

  it('early leave computed against fixed end even for part-day', () => {
    expect(getEarlyLeaveMinutes(new Date('2026-08-27T15:30:00Z'))).toBe(60) // left 19:30 UAE
  })
})

describe('AUDIT: leave balance period for Feb-29 hire (leap-year bug)', () => {
  const hireFeb29 = new Date('2024-02-29T00:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    mockDb.leaveType.findUniqueOrThrow.mockResolvedValue({ id: 'lt1', defaultDays: 30 })
    mockDb.leaveBalance.findUnique.mockResolvedValue(null)
    mockDb.leaveBalance.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'bal', ...data }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('period created in leap year 2024 is keyed 2024-02-29 (correct span, but key drifts next year)', async () => {
    vi.setSystemTime(new Date('2024-06-01T10:00:00Z'))
    await getOrCreateLeaveBalance('emp1', 'lt1', hireFeb29)
    const createCall = mockDb.leaveBalance.create.mock.calls[0][0]
    expect(createCall.data.yearStart.toISOString()).toBe('2024-02-29T00:00:00.000Z')
    // setFullYear rolls Feb 29 -> Mar 1 2025, then setDate(0) -> 2025-02-28; span itself is fine
    expect(createCall.data.yearEnd.toISOString()).toBe('2025-02-28T00:00:00.000Z')
  })

  it('on 2025-02-28 the anniversary day starts a NEW period (correct boundary)', async () => {
    vi.setSystemTime(new Date('2024-06-01T10:00:00Z'))
    await getOrCreateLeaveBalance('emp1', 'lt1', hireFeb29)
    vi.setSystemTime(new Date('2025-02-28T10:00:00Z'))
    await getOrCreateLeaveBalance('emp1', 'lt1', hireFeb29)

    const findKeys = mockDb.leaveBalance.findUnique.mock.calls.map(
      (c: unknown[]) => (c[0] as { where: { employeeId_leaveTypeId_yearStart: { yearStart: Date } } }).where.employeeId_leaveTypeId_yearStart.yearStart.toISOString(),
    )
    const createKeys = mockDb.leaveBalance.create.mock.calls.map(
      (c: unknown[]) => (c[0] as { data: { yearStart: Date } }).data.yearStart.toISOString(),
    )
    // FIXED: First lookup uses 2024-02-29 (current period); second uses 2025-02-28 (new period)
    // This is correct — Feb 28 2025 is the anniversary day and starts a new period
    expect(findKeys[0]).toBe('2024-02-29T00:00:00.000Z')
    expect(findKeys[1]).toBe('2025-02-28T00:00:00.000Z')
    // Two rows created — one for each period. This is correct behavior.
    expect(createKeys).toHaveLength(2)
  })
})

describe('FIX VERIFIED: updateLeave checks balance before approving', () => {
  const pending = {
    id: 'req1',
    employeeId: 'emp1',
    leaveTypeId: 'lt1',
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-09-07'),
    durationDays: 5,
    status: 'PENDING',
    reason: 'x',
    isHalfDay: false,
    employee: { id: 'emp1', userId: 'u1', hireDate: new Date('2020-01-01'), workWeek: JSON.stringify([0, 1, 2, 3, 4]) },
    leaveType: { id: 'lt1', name: 'Annual', isActive: true },
  }

  function mockTx(balance: { allocated: number; carriedOver: number; used: number }) {
    const txUpdate = vi.fn().mockResolvedValue({})
    mockDb.$transaction.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      const t = {
        leaveBalance: {
          findUnique: vi.fn().mockResolvedValue({ id: 'bal1', ...balance }),
          update: txUpdate,
        },
        leaveType: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'lt1', defaultDays: 30 }) },
        leaveRequest: { update: vi.fn().mockResolvedValue({}) },
      }
      await fn(t)
    })
    return txUpdate
  }

  it('rejects status=APPROVED when remaining balance is 0', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValue(pending)
    mockDb.leaveType.findUnique.mockResolvedValue({ id: 'lt1', name: 'Annual', isActive: true })
    mockDb.leaveRequest.findFirst.mockResolvedValue(null)
    const txUpdate = mockTx({ allocated: 10, carriedOver: 0, used: 10 }) // remaining = 0

    const result = await updateLeave(makeFormData({
      id: 'req1', leaveTypeId: 'lt1', startDate: '2026-09-01', endDate: '2026-09-07',
      isHalfDay: 'false', reason: 'x', status: 'APPROVED',
    }))

    expect(result?.error).toContain('enough leave balance')
    expect(txUpdate).not.toHaveBeenCalled() // no increment, balance cannot go negative
  })

  it('still approves via update when balance is sufficient', async () => {
    mockDb.leaveRequest.findUnique.mockResolvedValue(pending)
    mockDb.leaveType.findUnique.mockResolvedValue({ id: 'lt1', name: 'Annual', isActive: true })
    mockDb.leaveRequest.findFirst.mockResolvedValue(null)
    const txUpdate = mockTx({ allocated: 30, carriedOver: 0, used: 0 })

    const result = await updateLeave(makeFormData({
      id: 'req1', leaveTypeId: 'lt1', startDate: '2026-09-01', endDate: '2026-09-07',
      isHalfDay: 'false', reason: 'x', status: 'APPROVED',
    }))

    expect(result).toEqual({ success: true })
    expect(txUpdate).toHaveBeenCalledWith({ where: { id: 'bal1' }, data: { used: { increment: 5 } } })
  })
})

describe('FIX VERIFIED: approve and cancel use the SAME balance row (leave start-date period)', () => {
  const hire = new Date('2020-07-01T00:00:00Z')
  const request = {
    id: 'req1',
    employeeId: 'emp1',
    leaveTypeId: 'lt1',
    startDate: new Date('2026-06-15'), // belongs to period 2025-07-01 .. 2026-06-30
    endDate: new Date('2026-06-17'),
    durationDays: 3,
    status: 'PENDING',
    employee: { id: 'emp1', userId: 'u1', hireDate: hire },
    leaveType: { id: 'lt1', name: 'Annual' },
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-27T10:00:00Z')) // "now" is in the NEXT period (2026-07-01)
  })

  afterEach(() => vi.useRealTimers())

  it('approve deducts from the period containing the leave start date, matching cancel', async () => {
    // --- approve ---
    mockDb.leaveRequest.findUnique.mockResolvedValueOnce(request)
    const approveFindUnique = vi.fn().mockResolvedValue({ id: 'balLeavePeriod', allocated: 30, carriedOver: 0, used: 0 })
    mockDb.$transaction.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      const t = {
        leaveBalance: {
          findUnique: approveFindUnique,
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn(),
        },
        leaveType: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'lt1', defaultDays: 30 }) },
        leaveRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }
      await fn(t)
    })
    mockDb.employee.findUnique.mockResolvedValue({ id: 'emp1', user: { id: 'u1' } })
    await approveLeave(makeFormData({ id: 'req1' }))

    const approveYearStart = (approveFindUnique.mock.calls[0][0] as { where: { employeeId_leaveTypeId_yearStart: { yearStart: Date } } })
      .where.employeeId_leaveTypeId_yearStart.yearStart.toISOString()
    // period containing 2026-06-15 for a 2020-07-01 hire — NOT the now-based 2026-07-01 period
    expect(approveYearStart).toBe('2025-07-01T00:00:00.000Z')

    // --- cancel ---
    mockDb.leaveRequest.findUnique.mockResolvedValueOnce({ ...request, status: 'APPROVED' })
    const cancelFindUnique = vi.fn().mockResolvedValue({ id: 'balLeavePeriod' })
    mockDb.$transaction.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      const t = {
        leaveRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        leaveBalance: { findUnique: cancelFindUnique, update: vi.fn().mockResolvedValue({}) },
      }
      await fn(t)
    })
    await cancelLeave(makeFormData({ id: 'req1' }))

    const cancelWhere = (cancelFindUnique.mock.calls[0][0] as { where: { employeeId_leaveTypeId_yearStart: { yearStart: Date } } }).where
    // cancel refunds the same period the approval deducted from
    expect(cancelWhere.employeeId_leaveTypeId_yearStart.yearStart.toISOString()).toBe('2025-07-01T00:00:00.000Z')
  })
})

describe('AUDIT: payroll computation', () => {
  const emp = {
    id: 'emp1',
    firstName: 'Expat',
    lastName: 'Worker',
    nationality: 'Egypt', // non-GCC: GPSSA should NOT apply
    hireDate: new Date('2026-08-20T00:00:00Z'), // joined 11 days before period end
    isActive: true,
    salary: 13000,
    basicSalary: 10000,
    housingAllowance: 2000,
    transportAllowance: 1000,
    otherAllowances: 0,
  }

  async function runCreatePeriod(leaveRequests: unknown[] = []) {
    mockDb.payrollPeriod.findUnique.mockResolvedValue(null)
    mockDb.employee.findMany.mockResolvedValue([emp])
    mockDb.leaveType.findUnique.mockResolvedValue({ id: 'ltAnnual', name: 'Annual' })
    mockDb.leaveRequest.findMany.mockResolvedValue(leaveRequests)
    mockDb.attendanceRecord.groupBy.mockResolvedValue([])
    mockDb.attendanceRecord.findMany.mockResolvedValue([])
    mockDb.overtimeRecord.findMany.mockResolvedValue([])
    let captured: Record<string, unknown>[] = []
    mockDb.$transaction.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      const t = {
        payrollPeriod: { create: vi.fn().mockResolvedValue({ id: 'pp1' }) },
        payslip: { createMany: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown>[] }) => { captured = data; return { count: data.length } }) },
      }
      return await fn(t)
    })
    await createPayrollPeriod(makeFormData({ month: '8', year: '2026' }))
    return captured
  }

  it('deducts GPSSA 5% from a non-GCC (Egyptian) employee — compliance bug', async () => {
    const slips = await runCreatePeriod()
    expect(slips[0].gpssaEmployee).toBe(500) // AUDIT: 5% of 10000 deducted from an expat
  })

  it('pays FULL month salary to an employee hired on Aug 20 (no proration)', async () => {
    const slips = await runCreatePeriod()
    expect(slips[0].basicSalary).toBe(10000) // AUDIT: hired 2026-08-20, paid full August
    expect(slips[0].totalGross).toBe(13000)
  })

  it('a single HALF-DAY annual leave deducts a FULL day of transportation', async () => {
    const slips = await runCreatePeriod([
      { employeeId: 'emp1', startDate: new Date('2026-08-10'), endDate: new Date('2026-08-10'), durationDays: 0.5 },
    ])
    // 0.5 days rounds to 1 -> 500/30*1 = 16.67 instead of 8.33
    expect(slips[0].transportationDeduction).toBe(16.67)
  })
})

describe('computeEosb (canonical formula, basic salary)', () => {
  const DAY = 24 * 60 * 60 * 1000
  const hire = new Date('2020-01-01T00:00:00Z')

  it('under 5 years: 21 days/year of basic salary', () => {
    const r = computeEosb({ hireDate: hire, terminationDate: new Date(hire.getTime() + 2 * 365.25 * DAY), basicSalary: 6000, capMonths: 24 })
    expect(r.yearsOfService).toBe(2)
    expect(r.eosbAmount).toBe(8400) // 6000/30 * 21 * 2
  })

  it('exactly 5 years stays in the 21-days tier', () => {
    const r = computeEosb({ hireDate: hire, terminationDate: new Date(hire.getTime() + 5 * 365.25 * DAY), basicSalary: 6000, capMonths: 24 })
    expect(r.yearsOfService).toBe(5)
    expect(r.eosbAmount).toBe(21000) // 200 * 21 * 5
  })

  it('over 5 years: 21 days for first 5 years, 30 days after', () => {
    const r = computeEosb({ hireDate: hire, terminationDate: new Date(hire.getTime() + 7 * 365.25 * DAY), basicSalary: 6000, capMonths: 24 })
    expect(r.yearsOfService).toBe(7)
    expect(r.eosbAmount).toBe(33000) // 200 * (105 + 60)
  })

  it('30-year cap is now correct: cap = 2 months * years of service', () => {
    const r = computeEosb({ hireDate: hire, terminationDate: new Date(hire.getTime() + 30 * 365.25 * DAY), basicSalary: 6000, capMonths: 24 })
    // Cap: 6000 * 24 * 30 = 4,320,000 (no cap applies for 30 years at 6000)
    // Uncapped: ~171,000
    expect(r.eosbAmount).toBeCloseTo(171000, -2)
  })

  it('zero/negative tenure or salary yields 0', () => {
    expect(computeEosb({ hireDate: hire, terminationDate: hire, basicSalary: 6000, capMonths: 24 }).eosbAmount).toBe(0)
    expect(computeEosb({ hireDate: hire, terminationDate: new Date(hire.getTime() - DAY), basicSalary: 6000, capMonths: 24 }).eosbAmount).toBe(0)
    expect(computeEosb({ hireDate: hire, terminationDate: new Date(hire.getTime() + 3 * 365.25 * DAY), basicSalary: 0, capMonths: 24 }).eosbAmount).toBe(0)
  })
})

describe('FIX VERIFIED: EOSB at termination', () => {
  const emp = {
    id: 'emp1',
    userId: 'u1',
    firstName: 'T',
    lastName: 'E',
    hireDate: new Date('2024-08-01T00:00:00Z'),
    terminationDate: null as Date | null,
    salary: 12000, // gross — must NOT be the EOSB basis
    basicSalary: 6000,
    housingAllowance: 3000,
    transportAllowance: 2000,
    otherAllowances: 1000,
    isActive: true,
  }

  beforeEach(() => {
    mockSession.user.role = 'HR_ADMIN'
    mockDb.$transaction.mockResolvedValue([])
  })

  it('terminateEmployee pays EOSB on BASIC salary via the canonical formula', async () => {
    mockDb.employee.findUnique.mockResolvedValue(emp)
    await terminateEmployee('emp1', '2026-08-01')

    const call = mockDb.eosbRecord.create.mock.calls.at(-1)?.[0] as { data: { eosbAmount: number; yearsOfService: number; lastSalary: number } }
    const expected = computeEosb({ hireDate: emp.hireDate, terminationDate: new Date('2026-08-01'), basicSalary: 6000, capMonths: 24 })
    expect(call.data.eosbAmount).toBe(expected.eosbAmount)
    expect(call.data.eosbAmount).toBeLessThan(10000) // basic-based (~8.4k), not gross-based (~16.8k)
    expect(call.data.lastSalary).toBe(6000) // FIXED: stores basic salary, not gross
  })

  it('terminating an already-terminated employee is rejected; no duplicate EOSB record', async () => {
    mockDb.employee.findUnique
      .mockResolvedValueOnce(emp)
      .mockResolvedValueOnce({ ...emp, terminationDate: new Date('2026-08-01') })

    const first = await terminateEmployee('emp1', '2026-08-01')
    const second = await terminateEmployee('emp1', '2026-08-15')

    expect(first).toHaveProperty('success')
    expect(second?.error).toBe('This employee has already been terminated')
    expect(mockDb.eosbRecord.create).toHaveBeenCalledTimes(1)
  })

  it('termination date BEFORE hire date is rejected', async () => {
    mockDb.employee.findUnique.mockResolvedValue(emp)
    const res = await terminateEmployee('emp1', '2020-01-01')
    expect(res?.error).toBe('Termination date cannot be before the hire date')
    expect(mockDb.eosbRecord.create).not.toHaveBeenCalled()
  })

  it('malformed termination date is rejected', async () => {
    mockDb.employee.findUnique.mockResolvedValue(emp)
    const res = await terminateEmployee('emp1', 'not-a-date')
    expect(res?.error).toBe('Invalid input')
    expect(mockDb.eosbRecord.create).not.toHaveBeenCalled()
  })
})

describe('AUDIT: attendance', () => {
  it('autoClockout now reads the configurable AUTO_CLOCKOUT_HOUR/MINUTE settings', async () => {
    mockDb.appSetting.findUnique.mockImplementation(async ({ where }: { where: { key: string } }) => {
      if (where.key === 'AUTO_CLOCKOUT_HOUR') return { key: 'AUTO_CLOCKOUT_HOUR', value: '23' }
      if (where.key === 'AUTO_CLOCKOUT_MINUTE') return { key: 'AUTO_CLOCKOUT_MINUTE', value: '0' }
      return null
    })
    mockDb.attendanceRecord.findMany.mockResolvedValue([
      { id: 'r1', employeeId: 'emp1', checkIn: new Date('2026-08-27T07:30:00Z'), checkOut: null, employee: {} },
    ])
    const update = vi.fn().mockResolvedValue({})
    mockDb.attendanceRecord.update = update

    await autoClockout()

    // FIXED: settings ARE now consulted
    expect(mockDb.appSetting.findUnique).toHaveBeenCalled()
    const checkOut = (update.mock.calls[0][0] as { data: { checkOut: Date } }).data.checkOut
    // shiftEnd is constructed as Date.UTC(year, month, date, 23, 0, 0, 0)
    expect(checkOut.getUTCHours()).toBe(23) // reads the configured hour
  })

  it('markAbsent now skips employees who already have a checkIn recorded', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 'r1', checkIn: new Date('2026-08-27T07:30:00Z') }) // already checked in
    const upsert = vi.fn().mockResolvedValue({})
    mockDb.attendanceRecord.findUnique = findUnique
    mockDb.attendanceRecord.upsert = upsert

    await markAbsent(['emp1'], '2026-08-27')

    // FIXED: existing record with checkIn is skipped; upsert never called
    expect(findUnique).toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })
})

describe('AUDIT: data integrity', () => {
  it('submitLeave with a malformed date throws (500) instead of returning a validation error', async () => {
    mockSession.user.role = 'EMPLOYEE'
    mockDb.employee.findUnique.mockResolvedValue({
      id: 'emp1', userId: 'u1', hireDate: new Date('2020-01-01'), workWeek: JSON.stringify([0, 1, 2, 3, 4]),
    })
    mockDb.leaveType.findUnique.mockResolvedValue({ id: 'lt1', name: 'Annual', isActive: true, requiresAttachment: false })
    mockDb.holiday.findMany.mockResolvedValue([])

    // zod only checks string min(1); new Date('not-a-date') is Invalid Date and passes all < comparisons
    await expect(
      submitLeave(makeFormData({
        leaveTypeId: 'lt1', startDate: 'not-a-date', endDate: 'not-a-date', isHalfDay: 'false', reason: 'x',
      })),
    ).rejects.toThrow() // AUDIT: unhandled RangeError from toISOString(), not a graceful {error}
  })

  it('createUser without password returns a generatedPassword that does NOT match the stored hash', async () => {
    mockSession.user.role = 'HR_ADMIN'
    mockDb.user.findUnique = vi.fn().mockResolvedValue(null)
    let storedHash = ''
    mockDb.user.create = vi.fn().mockImplementation(async ({ data }: { data: { passwordHash: string } }) => {
      storedHash = data.passwordHash
      return { id: 'u2', email: 'new@x.com', role: 'EMPLOYEE', employee: null }
    })

    const result = await createUser(makeFormData({ email: 'new@x.com', role: 'EMPLOYEE' })) as { generatedPassword: string }
    const matches = await bcrypt.compare(result.generatedPassword, storedHash)
    expect(matches).toBe(false) // AUDIT: two different Math.random() values; the shown password can never log in
  })
})

describe('FIX VERIFIED: finalizePayroll requires at least one payslip', () => {
  beforeEach(() => {
    mockSession.user.role = 'MANAGER'
  })

  it('rejects a DRAFT period with zero payslips (dead-code bug in original filter)', async () => {
    mockDb.payrollPeriod.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT', month: 1, year: 2026 })
    mockDb.payslip.findMany.mockResolvedValue([])
    const update = vi.fn()
    ;(mockDb.payrollPeriod as Record<string, unknown>).update = update

    const r = await finalizePayroll(makeFormData({ periodId: 'p1' }))

    expect(r).toHaveProperty('error') // rejected as invalidInput
    expect(update).not.toHaveBeenCalled() // period was NOT finalized
  })

  it('rejects a DRAFT period with a NaN/gross<=0 payslip', async () => {
    mockDb.payrollPeriod.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT', month: 1, year: 2026 })
    mockDb.payslip.findMany.mockResolvedValue([{ id: 's1', totalGross: 'abc' }])
    const update = vi.fn()
    ;(mockDb.payrollPeriod as Record<string, unknown>).update = update

    const r = await finalizePayroll(makeFormData({ periodId: 'p1' }))

    expect(r).toHaveProperty('error')
    expect(update).not.toHaveBeenCalled()
  })

  it('finalizes a DRAFT period with valid payslips', async () => {
    mockDb.payrollPeriod.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT', month: 1, year: 2026 })
    mockDb.payslip.findMany.mockResolvedValue([{ id: 's1', totalGross: 5000 }])
    const update = vi.fn().mockResolvedValue({})
    ;(mockDb.payrollPeriod as Record<string, unknown>).update = update

    const r = await finalizePayroll(makeFormData({ periodId: 'p1' }))

    expect(r).toBeUndefined() // success path returns undefined
    expect(update).toHaveBeenCalled()
  })
})
