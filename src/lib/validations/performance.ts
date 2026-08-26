import { z } from 'zod'

export const ratingSchema = z.object({
  criteriaId: z.string().optional(),
  customName: z.string().optional(),
  rating: z.enum(['NEEDS_IMPROVEMENT', 'BELOW_EXPECTATIONS', 'MEETS', 'EXCEEDS', 'FAR_EXCEEDS']),
  comment: z.string().optional(),
})

export const goalSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  targetDate: z.string().optional(),
})

export const createReviewSchema = z.object({
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2020).max(2100),
  quarter: z.coerce.number().int().min(1).max(4),
  comments: z.string().optional(),
  bonusRecommendation: z.coerce.number().min(0).optional(),
  ratings: z.array(ratingSchema).min(1, 'At least one rating is required'),
  goals: z.array(goalSchema),
})

export const deleteReviewSchema = z.object({
  id: z.string().min(1),
})

export const submitReviewSchema = z.object({
  id: z.string().min(1),
})

export const approveReviewSchema = z.object({
  id: z.string().min(1),
})
