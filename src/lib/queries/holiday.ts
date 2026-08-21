import { db } from '@/lib/db'
import type { Holiday } from '@prisma/client'

export async function getHolidays(): Promise<Holiday[]> {
  return db.holiday.findMany({ orderBy: { date: 'asc' } })
}
