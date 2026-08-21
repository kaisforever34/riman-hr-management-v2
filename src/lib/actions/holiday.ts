'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { createHolidaySchema, deleteHolidaySchema } from '@/lib/validations/holiday'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createHoliday(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const parsed = createHolidaySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: await serverError('validationFailed'), fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    await db.holiday.create({
      data: { name: parsed.data.name, nameAr: parsed.data.nameAr || null, date: new Date(parsed.data.date) },
    })
  } catch (e) {
    const isUnique = typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002'
    if (isUnique) return { error: await serverError('invalidRequest'), fieldErrors: {} }
    throw e
  }

  revalidatePath('/manager/holidays')
}

export async function deleteHoliday(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const parsed = deleteHolidaySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  await db.holiday.delete({ where: { id: parsed.data.id } })
  revalidatePath('/manager/holidays')
}
