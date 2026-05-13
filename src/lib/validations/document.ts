import { z } from 'zod'

export const uploadEmployeeDocumentSchema = z.object({
  employeeId: z.string().min(1),
  category: z.string().min(1),
  notes: z.string().optional(),
})

export const uploadCompanyDocumentSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
})

export const deleteDocumentSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['employee', 'company']),
})
