import { db } from '@/lib/db'

export const WORK_START_HOUR = 11
export const WORK_START_MINUTE = 30
export const WORK_END_HOUR = 20
export const WORK_END_MINUTE = 30
export const DEFAULT_GRACE_MINUTES = 5

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

export function isWithinSchedule(date: Date, graceMinutes?: number): { isLate: boolean; lateMinutes: number } {
  const { hours, minutes } = getUaeTimeFromUtc(date)
  const totalMinutes = hours * 60 + minutes
  const startMinutes = WORK_START_HOUR * 60 + WORK_START_MINUTE
  const grace = graceMinutes ?? DEFAULT_GRACE_MINUTES
  if (totalMinutes <= startMinutes + grace) return { isLate: false, lateMinutes: 0 }
  return { isLate: true, lateMinutes: totalMinutes - startMinutes }
}

export function getEarlyLeaveMinutes(checkOut: Date): number {
  const { hours, minutes } = getUaeTimeFromUtc(checkOut)
  const totalMinutes = hours * 60 + minutes
  const endMinutes = WORK_END_HOUR * 60 + WORK_END_MINUTE
  if (totalMinutes >= endMinutes) return 0
  return endMinutes - totalMinutes
}

export function getOvertimeMinutes(checkOut: Date): number {
  const { hours, minutes } = getUaeTimeFromUtc(checkOut)
  const totalMinutes = hours * 60 + minutes
  const endMinutes = WORK_END_HOUR * 60 + WORK_END_MINUTE
  if (totalMinutes <= endMinutes) return 0
  return totalMinutes - endMinutes
}
