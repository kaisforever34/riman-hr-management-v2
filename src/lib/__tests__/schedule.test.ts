import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    appSetting: { findUnique: vi.fn() },
  },
}))

import {
  isWithinSchedule,
  getEarlyLeaveMinutes,
  getOvertimeMinutes,
  getWorkSchedule,
  getBreakSchedule,
  getGracePeriodMinutes,
  WORK_START_HOUR,
  WORK_START_MINUTE,
  WORK_END_HOUR,
  WORK_END_MINUTE,
  BREAK_START_HOUR,
  BREAK_START_MINUTE,
  BREAK_END_HOUR,
  BREAK_END_MINUTE,
} from '@/lib/schedule'

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = (await import('@/lib/db')).db as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isWithinSchedule with custom schedule', () => {
  it('uses default schedule when none provided', () => {
    // 07:35 UTC = 11:35 UAE = start(11:30)+grace(5)
    expect(isWithinSchedule(new Date('2026-08-27T07:35:00Z'), 5)).toEqual({ isLate: false, lateMinutes: 0 })
  })

  it('uses custom schedule when provided', () => {
    // custom start 09:00, grace 0
    const custom = { startHour: 9, startMinute: 0, endHour: 18, endMinute: 0, graceMinutes: 0 }
    // 05:00 UTC = 09:00 UAE — exactly on start, not late
    expect(isWithinSchedule(new Date('2026-08-27T05:00:00Z'), 0, custom)).toEqual({ isLate: false, lateMinutes: 0 })
    // 05:01 UTC = 09:01 UAE — 1 min late
    expect(isWithinSchedule(new Date('2026-08-27T05:01:00Z'), 0, custom)).toEqual({ isLate: true, lateMinutes: 1 })
  })
})

describe('getEarlyLeaveMinutes with custom schedule', () => {
  it('uses default end time 20:30 UAE', () => {
    // 16:30 UTC = 20:30 UAE → exactly on end → 0 early
    expect(getEarlyLeaveMinutes(new Date('2026-08-27T16:30:00Z'))).toBe(0)
    // 16:31 UTC = 20:31 → past end → 0 overtime (earlyLeave is 0 when after end)
    expect(getEarlyLeaveMinutes(new Date('2026-08-27T16:31:00Z'))).toBe(0)
  })

  it('uses custom schedule when provided', () => {
    const custom = { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, graceMinutes: 0 }
    // 13:00 UTC = 17:00 UAE → exactly on end
    expect(getEarlyLeaveMinutes(new Date('2026-08-27T13:00:00Z'), custom)).toBe(0)
    // 12:30 UTC = 16:30 UAE → 30 min early
    expect(getEarlyLeaveMinutes(new Date('2026-08-27T12:30:00Z'), custom)).toBe(30)
  })
})

describe('getOvertimeMinutes with custom schedule', () => {
  it('uses default end time', () => {
    expect(getOvertimeMinutes(new Date('2026-08-27T16:30:00Z'))).toBe(0) // 20:30 UAE
    expect(getOvertimeMinutes(new Date('2026-08-27T16:31:00Z'))).toBe(1)
  })

  it('uses custom schedule when provided', () => {
    const custom = { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, graceMinutes: 0 }
    // 13:00 UTC = 17:00 UAE → exactly on end → 0 overtime
    expect(getOvertimeMinutes(new Date('2026-08-27T13:00:00Z'), custom)).toBe(0)
    // 13:15 UTC = 17:15 UAE → 15 min overtime
    expect(getOvertimeMinutes(new Date('2026-08-27T13:15:00Z'), custom)).toBe(15)
  })
})

describe('getWorkSchedule', () => {
  it('returns DB values when settings exist', async () => {
    db.appSetting.findUnique.mockImplementation(async ({ where }: { where: { key: string } }) => {
      const vals: Record<string, string> = {
        WORK_START_HOUR: '9',
        WORK_START_MINUTE: '0',
        WORK_END_HOUR: '18',
        WORK_END_MINUTE: '0',
        GRACE_PERIOD_MINUTES: '10',
      }
      return vals[where.key] ? { key: where.key, value: vals[where.key] } : null
    })
    const schedule = await getWorkSchedule()
    expect(schedule).toEqual({
      startHour: 9,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
      graceMinutes: 10,
    })
  })

  it('falls back to defaults when no settings', async () => {
    db.appSetting.findUnique.mockResolvedValue(null)
    const schedule = await getWorkSchedule()
    expect(schedule).toEqual({
      startHour: WORK_START_HOUR,
      startMinute: WORK_START_MINUTE,
      endHour: WORK_END_HOUR,
      endMinute: WORK_END_MINUTE,
      graceMinutes: 5,
    })
  })
})

describe('getBreakSchedule', () => {
  it('returns DB values when settings exist', async () => {
    db.appSetting.findUnique.mockImplementation(async ({ where }: { where: { key: string } }) => {
      const vals: Record<string, string> = {
        BREAK_START_HOUR: '13',
        BREAK_START_MINUTE: '0',
        BREAK_END_HOUR: '14',
        BREAK_END_MINUTE: '0',
      }
      return vals[where.key] ? { key: where.key, value: vals[where.key] } : null
    })
    const schedule = await getBreakSchedule()
    expect(schedule).toEqual({
      startHour: 13,
      startMinute: 0,
      endHour: 14,
      endMinute: 0,
    })
  })

  it('falls back to defaults when no settings', async () => {
    db.appSetting.findUnique.mockResolvedValue(null)
    const schedule = await getBreakSchedule()
    expect(schedule).toEqual({
      startHour: BREAK_START_HOUR,
      startMinute: BREAK_START_MINUTE,
      endHour: BREAK_END_HOUR,
      endMinute: BREAK_END_MINUTE,
    })
  })
})

describe('getGracePeriodMinutes', () => {
  it('returns DB value when set', async () => {
    db.appSetting.findUnique.mockImplementation(async ({ where }: { where: { key: string } }) => {
      return where.key === 'GRACE_PERIOD_MINUTES' ? { key: where.key, value: '15' } : null
    })
    expect(await getGracePeriodMinutes()).toBe(15)
  })

  it('returns default when not set', async () => {
    db.appSetting.findUnique.mockResolvedValue(null)
    expect(await getGracePeriodMinutes()).toBe(5)
  })
})
