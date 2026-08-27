import { db } from '@/lib/db'

export const WORK_START_HOUR = 11
export const WORK_START_MINUTE = 30
export const WORK_END_HOUR = 20
export const WORK_END_MINUTE = 30
export const DEFAULT_GRACE_MINUTES = 5

// Break defaults (14:00–14:30)
export const BREAK_START_HOUR = 14
export const BREAK_START_MINUTE = 0
export const BREAK_END_HOUR = 14
export const BREAK_END_MINUTE = 30

export interface WorkSchedule {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  graceMinutes: number
}

export interface BreakSchedule {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export function getUaeTimeFromUtc(date: Date): { hours: number; minutes: number } {
  const uaeOffset = 4 * 60
  const uaeTime = new Date(date.getTime() + uaeOffset * 60 * 1000)
  return { hours: uaeTime.getUTCHours(), minutes: uaeTime.getUTCMinutes() }
}

export function getTodayUaeDate(): Date {
  const now = new Date()
  const uaeOffset = 4 * 60
  const uae = new Date(now.getTime() + uaeOffset * 60 * 1000)
  return new Date(Date.UTC(uae.getUTCFullYear(), uae.getUTCMonth(), uae.getUTCDate()))
}

export async function getGracePeriodMinutes(): Promise<number> {
  try {
    const setting = await db.appSetting.findUnique({ where: { key: 'GRACE_PERIOD_MINUTES' } })
    return setting ? parseInt(setting.value, 10) : DEFAULT_GRACE_MINUTES
  } catch {
    return DEFAULT_GRACE_MINUTES
  }
}

export async function getWorkSchedule(): Promise<WorkSchedule> {
  try {
    const [sh, sm, eh, em, grace] = await Promise.all([
      db.appSetting.findUnique({ where: { key: 'WORK_START_HOUR' } }),
      db.appSetting.findUnique({ where: { key: 'WORK_START_MINUTE' } }),
      db.appSetting.findUnique({ where: { key: 'WORK_END_HOUR' } }),
      db.appSetting.findUnique({ where: { key: 'WORK_END_MINUTE' } }),
      db.appSetting.findUnique({ where: { key: 'GRACE_PERIOD_MINUTES' } }),
    ])
    return {
      startHour: sh ? parseInt(sh.value, 10) : WORK_START_HOUR,
      startMinute: sm ? parseInt(sm.value, 10) : WORK_START_MINUTE,
      endHour: eh ? parseInt(eh.value, 10) : WORK_END_HOUR,
      endMinute: em ? parseInt(em.value, 10) : WORK_END_MINUTE,
      graceMinutes: grace ? parseInt(grace.value, 10) : DEFAULT_GRACE_MINUTES,
    }
  } catch {
    return {
      startHour: WORK_START_HOUR,
      startMinute: WORK_START_MINUTE,
      endHour: WORK_END_HOUR,
      endMinute: WORK_END_MINUTE,
      graceMinutes: DEFAULT_GRACE_MINUTES,
    }
  }
}

export async function getBreakSchedule(): Promise<BreakSchedule> {
  try {
    const [sh, sm, eh, em] = await Promise.all([
      db.appSetting.findUnique({ where: { key: 'BREAK_START_HOUR' } }),
      db.appSetting.findUnique({ where: { key: 'BREAK_START_MINUTE' } }),
      db.appSetting.findUnique({ where: { key: 'BREAK_END_HOUR' } }),
      db.appSetting.findUnique({ where: { key: 'BREAK_END_MINUTE' } }),
    ])
    return {
      startHour: sh ? parseInt(sh.value, 10) : BREAK_START_HOUR,
      startMinute: sm ? parseInt(sm.value, 10) : BREAK_START_MINUTE,
      endHour: eh ? parseInt(eh.value, 10) : BREAK_END_HOUR,
      endMinute: em ? parseInt(em.value, 10) : BREAK_END_MINUTE,
    }
  } catch {
    return {
      startHour: BREAK_START_HOUR,
      startMinute: BREAK_START_MINUTE,
      endHour: BREAK_END_HOUR,
      endMinute: BREAK_END_MINUTE,
    }
  }
}

export async function getAutoClockoutTime(): Promise<{ hour: number; minute: number }> {
  try {
    const hourSetting = await db.appSetting.findUnique({ where: { key: 'AUTO_CLOCKOUT_HOUR' } })
    const minSetting = await db.appSetting.findUnique({ where: { key: 'AUTO_CLOCKOUT_MINUTE' } })
    return {
      hour: hourSetting ? parseInt(hourSetting.value, 10) : WORK_END_HOUR,
      minute: minSetting ? parseInt(minSetting.value, 10) : WORK_END_MINUTE,
    }
  } catch {
    return { hour: WORK_END_HOUR, minute: WORK_END_MINUTE }
  }
}

export function isWithinSchedule(
  date: Date,
  graceMinutes?: number,
  schedule?: WorkSchedule,
): { isLate: boolean; lateMinutes: number } {
  const { hours, minutes } = getUaeTimeFromUtc(date)
  const totalMinutes = hours * 60 + minutes
  const startHour = schedule?.startHour ?? WORK_START_HOUR
  const startMinute = schedule?.startMinute ?? WORK_START_MINUTE
  const startMinutes = startHour * 60 + startMinute
  const grace = graceMinutes ?? schedule?.graceMinutes ?? DEFAULT_GRACE_MINUTES
  if (totalMinutes <= startMinutes + grace) return { isLate: false, lateMinutes: 0 }
  return { isLate: true, lateMinutes: totalMinutes - startMinutes - grace }
}

export function getEarlyLeaveMinutes(checkOut: Date, schedule?: WorkSchedule): number {
  const { hours, minutes } = getUaeTimeFromUtc(checkOut)
  const totalMinutes = hours * 60 + minutes
  const endHour = schedule?.endHour ?? WORK_END_HOUR
  const endMinute = schedule?.endMinute ?? WORK_END_MINUTE
  const endMinutes = endHour * 60 + endMinute
  if (totalMinutes >= endMinutes) return 0
  return endMinutes - totalMinutes
}

export function getOvertimeMinutes(checkOut: Date, schedule?: WorkSchedule): number {
  const { hours, minutes } = getUaeTimeFromUtc(checkOut)
  const totalMinutes = hours * 60 + minutes
  const endHour = schedule?.endHour ?? WORK_END_HOUR
  const endMinute = schedule?.endMinute ?? WORK_END_MINUTE
  const endMinutes = endHour * 60 + endMinute
  if (totalMinutes <= endMinutes) return 0
  return totalMinutes - endMinutes
}
