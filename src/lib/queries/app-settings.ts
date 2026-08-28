import { db } from '@/lib/db'
import { settingFallback } from '@/lib/settings-defs'

export async function getAppSetting(key: string): Promise<string | null> {
  try {
    const setting = await db.appSetting.findUnique({ where: { key } })
    return setting?.value ?? null
  } catch {
    return null
  }
}

export async function getSettingValue(key: string): Promise<string> {
  const value = await getAppSetting(key)
  return value ?? settingFallback(key)
}

export async function getNumericSetting(key: string): Promise<number> {
  const value = await getSettingValue(key)
  const num = parseFloat(value)
  if (Number.isFinite(num)) return num
  const fallback = parseFloat(settingFallback(key))
  return Number.isFinite(fallback) ? fallback : 0
}

export async function getListSetting(key: string): Promise<string[]> {
  const value = await getSettingValue(key)
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

export async function getIntListSetting(key: string): Promise<number[]> {
  const list = await getListSetting(key)
  const nums = list.map(s => parseInt(s, 10)).filter(n => Number.isFinite(n))
  if (nums.length === 0) {
    return settingFallback(key).split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n))
  }
  return nums
}
