import { z } from 'zod'

export const createPayrollPeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2099),
})

export const updateLateDeductionSchema = z.object({
  payslipId: z.string().min(1),
  lateDeduction: z.coerce.number().min(0),
})
