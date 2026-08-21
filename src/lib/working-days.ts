const UAE_OFFSET_MS = 4 * 60 * 60 * 1000

export function toUaeDateKey(d: Date): string {
  return new Date(d.getTime() + UAE_OFFSET_MS).toISOString().slice(0, 10)
}

function keyToUtcMidnight(key: string): number {
  return Date.parse(`${key}T00:00:00Z`)
}

export function isWorkingDay(dateKey: string, workWeek: number[], holidays: Set<string>): boolean {
  if (holidays.has(dateKey)) return false
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
  return workWeek.includes(day)
}

export function countWorkingDays(
  startKey: string,
  endKey: string,
  workWeek: number[],
  holidays: Set<string>,
): number {
  let count = 0
  const DAY_MS = 24 * 60 * 60 * 1000
  for (let t = keyToUtcMidnight(startKey); t <= keyToUtcMidnight(endKey); t += DAY_MS) {
    if (isWorkingDay(new Date(t).toISOString().slice(0, 10), workWeek, holidays)) count++
  }
  return count
}
