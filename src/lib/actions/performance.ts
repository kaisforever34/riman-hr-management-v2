'use server'

import { db } from '@/lib/db'
import { createReviewSchema, deleteReviewSchema } from '@/lib/validations/performance'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

function computeOverallRating(ratings: { rating: string }[]): string {
  const values: Record<string, number> = { EXCEEDS: 3, MEETS: 2, BELOW: 1 }
  const avg = ratings.reduce((sum, r) => sum + (values[r.rating] || 0), 0) / ratings.length
  if (avg >= 2.6) return 'EXCEEDS'
  if (avg >= 1.6) return 'MEETS'
  return 'BELOW'
}

export async function createReview(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const raw = {
    employeeId: formData.get('employeeId') as string,
    year: parseInt(formData.get('year') as string),
    quarter: parseInt(formData.get('quarter') as string),
    comments: (formData.get('comments') as string) || undefined,
    bonusRecommendation: formData.get('bonusRecommendation')
      ? parseFloat(formData.get('bonusRecommendation') as string)
      : undefined,
    ratings: JSON.parse(formData.get('ratings') as string),
    goals: JSON.parse(formData.get('goals') as string || '[]'),
  }

  const parsed = createReviewSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const existing = await db.performanceReview.findFirst({
    where: {
      employeeId: parsed.data.employeeId,
      year: parsed.data.year,
      quarter: parsed.data.quarter,
    },
  })
  if (existing) return { error: 'A review already exists for this employee in this period' }

  const overallRating = computeOverallRating(parsed.data.ratings)

  await db.performanceReview.create({
    data: {
      employeeId: parsed.data.employeeId,
      year: parsed.data.year,
      quarter: parsed.data.quarter,
      overallRating,
      comments: parsed.data.comments || null,
      bonusRecommendation: parsed.data.bonusRecommendation || null,
      status: 'COMPLETED',
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

export async function deleteReview(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = deleteReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request' }

  const review = await db.performanceReview.findUnique({ where: { id: parsed.data.id } })
  if (!review) return { error: 'Review not found' }

  await db.performanceReview.delete({ where: { id: parsed.data.id } })

  revalidatePath('/manager/performance')
  return { success: true }
}
