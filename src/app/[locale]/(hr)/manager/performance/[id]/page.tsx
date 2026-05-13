import { auth } from '@/lib/auth'
import { getReviewById } from '@/lib/queries/performance'
import { notFound } from 'next/navigation'
import { ReviewDetailClient } from './review-detail-client'

export const dynamic = 'force-dynamic'

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const review = await getReviewById(id)
  if (!review) notFound()

  return (
    <ReviewDetailClient
      review={{
        id: review.id,
        employeeName: `${review.employee.firstName} ${review.employee.lastName}`,
        department: review.employee.department,
        jobTitle: review.employee.jobTitle,
        year: review.year,
        quarter: review.quarter,
        overallRating: review.overallRating,
        comments: review.comments,
        bonusRecommendation: review.bonusRecommendation ? Number(review.bonusRecommendation) : null,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
        ratings: review.ratings.map(r => ({
          id: r.id,
          criteriaName: r.criteria?.name || r.customName || 'Custom',
          rating: r.rating,
          comment: r.comment,
        })),
        goals: review.goals.map(g => ({
          id: g.id,
          description: g.description,
          targetDate: g.targetDate?.toISOString() || null,
          isCompleted: g.isCompleted,
        })),
      }}
    />
  )
}
