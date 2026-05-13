export const WORK_START_HOUR = 11
export const WORK_START_MINUTE = 30
export const WORK_END_HOUR = 20
export const WORK_END_MINUTE = 30

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

export function isWithinSchedule(date: Date): { isLate: boolean; lateMinutes: number } {
  const { hours, minutes } = getUaeTimeFromUtc(date)
  const totalMinutes = hours * 60 + minutes
  const startMinutes = WORK_START_HOUR * 60 + WORK_START_MINUTE
  if (totalMinutes <= startMinutes) return { isLate: false, lateMinutes: 0 }
  return { isLate: true, lateMinutes: totalMinutes - startMinutes }
}

export function getEarlyLeaveMinutes(checkOut: Date): number {
  const { hours, minutes } = getUaeTimeFromUtc(checkOut)
  const totalMinutes = hours * 60 + minutes
  const endMinutes = WORK_END_HOUR * 60 + WORK_END_MINUTE
  if (totalMinutes >= endMinutes) return 0
  return endMinutes - totalMinutes
}
