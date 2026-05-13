import { z } from 'zod'

export const checkInSchema = z.object({})

export const manualCheckInSchema = z.object({
  checkIn: z.string().min(1, 'Check-in time is required'),
  note: z.string().min(1, 'Reason for manual check-in is required'),
})

export const checkOutSchema = z.object({})

export const managerOverrideSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
})
