'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import {
  createReviewSchema,
  deleteReviewSchema,
  submitReviewSchema,
  approveReviewSchema,
} from '@/lib/validations/performance'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

const ratingValues: Record<string, number> = {
  NEEDS_IMPROVEMENT: 1,
  BELOW_EXPECTATIONS: 2,
  MEETS: 3,
  EXCEEDS: 4,
  FAR_EXCEEDS: 5,
}

function computeOverallRating(ratings: { rating: string }[]): string {
  const avg =
    ratings.reduce((sum, r) => sum + (ratingValues[r.rating] ?? 0), 0) /
    ratings.length
  if (avg >= 4.5) return 'FAR_EXCEEDS'
  if (avg >= 3.5) return 'EXCEEDS'
  if (avg >= 2.5) return 'MEETS'
  if (avg >= 1.5) return 'BELOW_EXPECTATIONS'
  return 'NEEDS_IMPROVEMENT'
}

export async function createReview(formData: FormData) {
  const session = await auth()
  if (
    !session?.user ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')
  )
    return { error: await serverError('unauthorized') }

  const raw = {
    employeeId: formData.get('employeeId') as string,
    year: parseInt(formData.get('year') as string),
    quarter: parseInt(formData.get('quarter') as string),
    comments: (formData.get('comments') as string) || undefined,
    bonusRecommendation: formData.get('bonusRecommendation')
      ? parseFloat(formData.get('bonusRecommendation') as string)
      : undefined,
    ratings: JSON.parse(formData.get('ratings') as string),
    goals: JSON.parse((formData.get('goals') as string) || '[]'),
  }

  const parsed = createReviewSchema.safeParse(raw)
  if (!parsed.success)
    return {
      error: await serverError('invalidInput'),
      fieldErrors: parsed.error.flatten().fieldErrors,
    }

  const existing = await db.performanceReview.findFirst({
    where: {
      employeeId: parsed.data.employeeId,
      year: parsed.data.year,
      quarter: parsed.data.quarter,
    },
  })
  if (existing) return { error: await serverError('reviewExists') }

  const overallRating = computeOverallRating(parsed.data.ratings)

  await db.performanceReview.create({
    data: {
      employeeId: parsed.data.employeeId,
      year: parsed.data.year,
      quarter: parsed.data.quarter,
      overallRating,
      comments: parsed.data.comments || null,
      bonusRecommendation: parsed.data.bonusRecommendation || null,
      status: 'DRAFT',
      ratings: {
        create: parsed.data.ratings.map(r => ({
          criteriaId: r.criteriaId || null,
          customName: r.customName || null,
          rating: r.rating,
          comment: r.comment || null,
        })),
      },
      goals: {
        create: parsed.data.goals.map(g => ({
          description: g.description,
          targetDate: g.targetDate ? new Date(g.targetDate) : null,
        })),
      },
    },
  })

  revalidatePath('/manager/performance')
  return { success: true }
}

export async function submitReview(formData: FormData) {
  const session = await auth()
  if (
    !session?.user ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')
  )
    return { error: await serverError('unauthorized') }

  const parsed = submitReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  const review = await db.performanceReview.findUnique({
    where: { id: parsed.data.id },
  })
  if (!review) return { error: await serverError('reviewNotFound') }
  if (review.status !== 'DRAFT')
    return { error: await serverError('reviewNotDraft') }

  await db.performanceReview.update({
    where: { id: parsed.data.id },
    data: { status: 'SUBMITTED' },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    action: 'REVIEW_SUBMITTED',
    entityType: 'PerformanceReview',
    entityId: parsed.data.id,
  })

  revalidatePath('/manager/performance')
  return { success: true }
}

export async function approveReview(formData: FormData) {
  const session = await auth()
  if (
    !session?.user ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')
  )
    return { error: await serverError('unauthorized') }

  const parsed = approveReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  const review = await db.performanceReview.findUnique({
    where: { id: parsed.data.id },
  })
  if (!review) return { error: await serverError('reviewNotFound') }
  if (review.status !== 'SUBMITTED')
    return { error: await serverError('reviewNotSubmitted') }

  await db.performanceReview.update({
    where: { id: parsed.data.id },
    data: { status: 'APPROVED' },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    action: 'REVIEW_APPROVED',
    entityType: 'PerformanceReview',
    entityId: parsed.data.id,
  })

  revalidatePath('/manager/performance')
  return { success: true }
}

export async function deleteReview(formData: FormData) {
  const session = await auth()
  if (
    !session?.user ||
    (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')
  )
    return { error: await serverError('unauthorized') }

  const parsed = deleteReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  const review = await db.performanceReview.findUnique({
    where: { id: parsed.data.id },
  })
  if (!review) return { error: await serverError('reviewNotFound') }
  if (review.status !== 'DRAFT')
    return { error: await serverError('reviewNotDraft') }

  await db.performanceReview.delete({ where: { id: parsed.data.id } })

  revalidatePath('/manager/performance')
  return { success: true }
}
