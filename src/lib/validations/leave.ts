import { z } from 'zod'

export const leaveTypeSchema = z.enum([
  'Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Hajj/Umrah', 'Compassionate', 'Unpaid',
])

export const submitLeaveSchema = z
  .object({
    employeeId: z.string().optional(),
    leaveTypeId: z.string().min(1, 'Leave type is required'),
    leaveTypeName: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isHalfDay: z.string().optional(),
    halfDayPeriod: z.string().optional(),
    reason: z.string().optional(),
  })
  .refine(
    (d) => d.isHalfDay !== 'true' || d.startDate === d.endDate,
    { message: 'Half-day leave must start and end on the same day', path: ['endDate'] },
  )
  .refine(
    (d) => {
      if (d.leaveTypeName === 'Sick') return true
      return !!d.reason && d.reason.length > 0
    },
    { message: 'Reason is required for this leave type', path: ['reason'] },
  )

export const approveLeaveSchema = z.object({
  id: z.string().min(1),
})

export const rejectLeaveSchema = z.object({
  id: z.string().min(1),
  rejectReason: z.string().min(1, 'Rejection reason is required'),
})

export const cancelLeaveSchema = z.object({
  id: z.string().min(1),
})

export const setAllocationSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  allocated: z.coerce.number().int().min(0),
})

export const submitOvertimeSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  minutes: z.coerce.number().int().min(15, 'Minimum 15 minutes overtime'),
  reason: z.string().min(1, 'Reason is required'),
})

export const approveOvertimeSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
})

export type SubmitLeaveData = z.infer<typeof submitLeaveSchema>
export type SetAllocationData = z.infer<typeof setAllocationSchema>
export type SubmitOvertimeData = z.infer<typeof submitOvertimeSchema>
