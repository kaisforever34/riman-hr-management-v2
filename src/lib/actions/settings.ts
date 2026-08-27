'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { getAppSetting } from '@/lib/queries/payroll'
import { z } from 'zod'
import { SETTING_DEFINITIONS } from '@/lib/settings-defs'

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

const updateSettingsSchema = z.array(settingSchema)

export async function getAllSettings() {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const result: Record<string, string> = {}
  for (const def of SETTING_DEFINITIONS) {
    const val = await getAppSetting(def.key)
    result[def.key] = val ?? String(def.fallback)
  }
  return { data: result }
}

export async function updateSettings(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const entries: { key: string; value: string }[] = []
  for (const def of SETTING_DEFINITIONS) {
    const raw = formData.get(def.key)
    if (raw === null) continue
    entries.push({ key: def.key, value: String(raw) })
  }

  const parsed = updateSettingsSchema.safeParse(entries)
  if (!parsed.success) {
    return { error: await serverError('validationFailed'), fieldErrors: parsed.error.flatten().fieldErrors }
  }

  for (const entry of parsed.data) {
    await db.appSetting.upsert({
      where: { key: entry.key },
      update: { value: entry.value },
      create: { key: entry.key, value: entry.value },
    })
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'SETTINGS_UPDATED',
    entityType: 'AppSetting',
    entityId: 'compliance-settings',
    detail: { settings: parsed.data },
  })

  revalidatePath('/manager/settings')
  revalidatePath('/manager/payroll')

  return { success: true }
}
