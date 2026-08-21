'use server'

import { serverError } from '@/lib/errors'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createNotification, createNotifications, getApproverUserIds } from './notifications'

export async function startOnboarding(employeeId: string, type: 'ONBOARDING' | 'OFFBOARDING', reason?: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: await serverError('unauthorized') }
  }

  const templates = await db.onboardingTask.findMany({
    where: { type },
    orderBy: { order: 'asc' },
  })

  const onboarding = await db.employeeOnboarding.create({
    data: {
      employeeId,
      type,
      reason: reason ?? null,
      status: 'IN_PROGRESS',
      tasks: {
        create: templates.map((t) => ({
          taskTemplateId: t.id,
          assignedTo: t.category === 'MANAGER_ACTION' ? 'MANAGER' : 'EMPLOYEE',
          status: 'PENDING',
        })),
      },
    },
    include: { tasks: true },
  })

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  })
  if (employee) {
    await createNotification(
      employee.user.id,
      type === 'ONBOARDING' ? 'ONBOARDING_TASK' : 'OFFBOARDING_TASK',
      type === 'ONBOARDING' ? 'Onboarding Started' : 'Offboarding Started',
      `Your ${type.toLowerCase()} process has been started. Please complete your tasks.`,
      '/onboarding',
    )
  }

  revalidatePath('/manager/onboarding')
  revalidatePath('/manager/offboarding')
  return { id: onboarding.id }
}

export async function completeOnboardingTask(taskId: string, formData?: Record<string, unknown>) {
  const session = await auth()
  if (!session?.user) return { error: await serverError('unauthorized') }

  const task = await db.employeeOnboardingTask.findUnique({
    where: { id: taskId },
    include: {
      taskTemplate: true,
      onboarding: { include: { employee: true } },
    },
  })

  if (!task) return { error: await serverError('taskNotFound') }
  if (task.status === 'COMPLETED') return { error: await serverError('taskAlreadyCompleted') }

  if (task.assignedTo === 'EMPLOYEE') {
    const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
    if (!employee || employee.id !== task.onboarding.employeeId) return { error: await serverError('notYourTask') }
  } else {
    if (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER') return { error: await serverError('unauthorized') }
  }

  await db.$transaction(async (tx) => {
    await tx.employeeOnboardingTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: session.user.id,
        formData: (formData ?? undefined) as Prisma.InputJsonValue,
      },
    })

    const remaining = await tx.employeeOnboardingTask.count({
      where: { onboardingId: task.onboardingId, status: { not: 'COMPLETED' } },
    })

    if (remaining === 0) {
      await tx.employeeOnboarding.update({
        where: { id: task.onboardingId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    }
  })

  if (task.assignedTo === 'EMPLOYEE') {
    const approverIds = await getApproverUserIds(task.onboarding.employeeId)
    await createNotifications(
      approverIds,
      'ONBOARDING_TASK',
      'Task Completed',
      `${task.onboarding.employee.firstName} ${task.onboarding.employee.lastName} completed: ${task.taskTemplate.titleEn}`,
      `/manager/${task.onboarding.type.toLowerCase()}/${task.onboardingId}`,
    )
  }

  revalidatePath('/en/onboarding')
  revalidatePath(`/en/manager/${task.onboarding.type.toLowerCase()}/${task.onboardingId}`)
  return { success: true }
}

export async function getOnboardingRecords(type: 'ONBOARDING' | 'OFFBOARDING') {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return []
  }

  return db.employeeOnboarding.findMany({
    where: { type },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, jobTitle: true, department: true, employeeCode: true },
      },
      tasks: {
        include: { taskTemplate: true },
        orderBy: { taskTemplate: { order: 'asc' } },
      },
    },
    orderBy: { startedAt: 'desc' },
  })
}

export async function getMyOnboarding() {
  const session = await auth()
  if (!session?.user) return null

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return null

  return db.employeeOnboarding.findFirst({
    where: { employeeId: employee.id, type: 'ONBOARDING', status: { in: ['PENDING', 'IN_PROGRESS'] } },
    include: {
      tasks: {
        include: { taskTemplate: true },
        orderBy: { taskTemplate: { order: 'asc' } },
      },
    },
  })
}

export async function getActiveEmployees() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return []
  }

  return db.employee.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, jobTitle: true, department: true, employeeCode: true },
    orderBy: { firstName: 'asc' },
  })
}
