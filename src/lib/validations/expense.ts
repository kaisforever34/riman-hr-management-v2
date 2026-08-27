import { z } from 'zod'

export const expenseCategories = [
  'MATERIALS', 'TRAVEL', 'MEALS', 'SUPPLIES', 'MAINTENANCE', 'UTILITIES', 'OTHER',
] as const

export const expenseStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const

export const createExpenseSchema = z.object({
  employeeId: z.string().min(1).optional(),
  title: z.string().min(1, 'Title is required').max(200),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.enum(expenseCategories),
  description: z.string().max(500).optional(),
})

export const updateExpenseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.enum(expenseCategories),
  description: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
})

export const reviewExpenseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
})

export type CreateExpenseData = z.infer<typeof createExpenseSchema>
export type UpdateExpenseData = z.infer<typeof updateExpenseSchema>
export type ReviewExpenseData = z.infer<typeof reviewExpenseSchema>
