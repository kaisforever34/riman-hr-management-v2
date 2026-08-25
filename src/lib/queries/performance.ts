import { db } from '@/lib/db'
import type { ReviewStatus } from '@/lib/types'

export async function getReviews(filters?: {
  employeeId?: string
  year?: number
  quarter?: number
  status?: ReviewStatus
}) {
  return db.performanceReview.findMany({
    where: {
      ...(filters?.employeeId && { employeeId: filters.employeeId }),
      ...(filters?.year && { year: filters.year }),
      ...(filters?.quarter && { quarter: filters.quarter }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, department: true } },
    },
    orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
  })
}

export async function getReviewById(id: string) {
  return db.performanceReview.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true, department: true, jobTitle: true } },
      ratings: {
        include: { criteria: { select: { name: true, nameAr: true } } },
      },
      goals: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export async function getBaseCriteria() {
  return db.reviewCriteria.findMany({
    where: { isActive: true, isBase: true },
    orderBy: { name: 'asc' },
  })
}
