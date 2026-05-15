'use server'

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type QuestionInput = { type: string; question: string; options?: string[]; order: number }

export async function createSurvey(
  title: string,
  description: string | null,
  isAnonymous: boolean,
  dueDate: string | null,
  employeeIds: string[],
  questions: QuestionInput[],
) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  const survey = await db.survey.create({
    data: {
      title,
      description,
      isAnonymous,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: session.user.id,
      questions: {
        create: questions.map((q) => ({
          type: q.type,
          question: q.question,
          options: q.options ? q.options : undefined,
          order: q.order,
        })),
      },
      assignments: {
        create: employeeIds.map((empId) => ({
          employeeId: empId,
          status: 'PENDING',
        })),
      },
    },
  })

  revalidatePath('/manager/surveys')
  return { id: survey.id }
}

export async function getSurveys() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return []
  }

  return db.survey.findMany({
    include: {
      createdBy: { select: { email: true } },
      _count: { select: { assignments: true, questions: true } },
      assignments: { select: { status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSurveyResults(surveyId: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return null
  }

  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          responses: {
            include: { assignment: { include: { employee: { select: { firstName: true, lastName: true } } } } },
          },
        },
      },
      assignments: {
        include: { employee: { select: { firstName: true, lastName: true, department: true } } },
      },
    },
  })

  return survey
}

export async function getMySurveys() {
  const session = await auth()
  if (!session?.user) return []

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return []

  return db.surveyAssignment.findMany({
    where: { employeeId: employee.id },
    include: {
      survey: {
        include: { questions: { orderBy: { order: 'asc' } } },
      },
    },
    orderBy: { survey: { createdAt: 'desc' } },
  })
}

export async function submitSurveyResponses(assignmentId: string, responses: { questionId: string; value: unknown }[]) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const assignment = await db.surveyAssignment.findUnique({
    where: { id: assignmentId },
    include: { employee: true },
  })
  if (!assignment) return { error: 'Assignment not found' }
  if (assignment.employee.userId !== session.user.id) return { error: 'Not your survey' }
  if (assignment.status === 'COMPLETED') return { error: 'Already completed' }

  for (const r of responses) {
    await db.surveyResponse.create({
      data: {
        questionId: r.questionId,
        assignmentId,
        value: r.value as Prisma.InputJsonValue,
      },
    })
  }

  await db.surveyAssignment.update({
    where: { id: assignmentId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  revalidatePath('/surveys')
  return { success: true }
}
