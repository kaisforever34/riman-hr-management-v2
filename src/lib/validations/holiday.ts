import { z } from 'zod'

export const createHolidaySchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  nameAr: z.string().max(100).optional(),
  date: z.string().min(1, 'Required'),
})

export const deleteHolidaySchema = z.object({
  id: z.string().min(1),
})
