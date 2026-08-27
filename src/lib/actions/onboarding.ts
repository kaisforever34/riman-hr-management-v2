'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createNotification, createNotifications, getApproverUserIds } from './notifications'
import { logAudit } from '@/lib/audit'

export async function startOnboarding(employeeId: string, type: 'ONBOARDING' | 'OFFBOARDING', reason?: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: await serverError('unauthorized') }
  }

  const templates = await db.onboardingTask.findMany({
    where: { type },
    orderBy: { order: 'asc' },
  })

  const startedAt = new Date()

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
          deadline: new Date(startedAt.getTime() + t.order * 7 * 24 * 60 * 60 * 1000),
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

  await logAudit({
    actorId: session.user.id,
    action: type === 'ONBOARDING' ? 'ONBOARDING_STARTED' : 'OFFBOARDING_STARTED',
    entityType: 'EmployeeOnboarding',
    entityId: onboarding.id,
    detail: { employeeId, type },
  })

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
      onboarding: { include: { employee: { include: { user: true } } } },
    },
  })

  if (!task) return { error: await serverError('taskNotFound') }
  if (task.status === 'COMPLETED') return { error: await serverError('taskAlreadyCompleted') }

  const isApproverRole = session.user.role === 'HR_ADMIN' || session.user.role === 'MANAGER'

  if (task.assignedTo === 'EMPLOYEE') {
    const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
    const isOwner = employee && employee.id === task.onboarding.employeeId
    if (!isOwner && !isApproverRole) return { error: await serverError('notYourTask') }
  } else {
    if (!isApproverRole) return { error: await serverError('unauthorized') }
  }

  const isOverdue = task.deadline ? new Date() > task.deadline : false

  await db.$transaction(async (tx) => {
    await tx.employeeOnboardingTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: session.user.id,
        formData: formData ? JSON.stringify(formData) : undefined,
        notes: isOverdue ? 'Completed after deadline (overdue)' : undefined,
      },
    })

    const remaining = await tx.employeeOnboardingTask.count({
      where: {
        onboardingId: task.onboardingId,
        status: { notIn: ['COMPLETED', 'SKIPPED'] },
      },
    })

    if (remaining === 0) {
      await tx.employeeOnboarding.update({
        where: { id: task.onboardingId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      if (task.onboarding.type === 'OFFBOARDING') {
        const emp = task.onboarding.employee
        await tx.employee.update({
          where: { id: emp.id },
          data: { isActive: false },
        })
        await tx.user.update({
          where: { id: emp.userId },
          data: { isActive: false, tokenVersion: { increment: 1 } },
        })
      }
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

  await logAudit({
    actorId: session.user.id,
    action: 'ONBOARDING_TASK_COMPLETED',
    entityType: 'EmployeeOnboardingTask',
    entityId: taskId,
    detail: { onboardingId: task.onboardingId, isOverdue },
  })

  revalidatePath('/en/onboarding')
  revalidatePath(`/en/manager/${task.onboarding.type.toLowerCase()}/${task.onboardingId}`)
  return { success: true, isOverdue }
}

export async function skipTask(taskId: string) {
  const session = await auth()
  if (!session?.user) return { error: await serverError('unauthorized') }
  if (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER') {
    return { error: await serverError('unauthorized') }
  }

  const task = await db.employeeOnboardingTask.findUnique({
    where: { id: taskId },
    include: {
      taskTemplate: true,
      onboarding: { include: { employee: { include: { user: true } } } },
    },
  })

  if (!task) return { error: await serverError('taskNotFound') }
  if (task.status !== 'PENDING') return { error: await serverError('taskNotFound') }

  await db.$transaction(async (tx) => {
    await tx.employeeOnboardingTask.update({
      where: { id: taskId },
      data: {
        status: 'SKIPPED',
        completedAt: new Date(),
        completedById: session.user.id,
      },
    })

    const remaining = await tx.employeeOnboardingTask.count({
      where: {
        onboardingId: task.onboardingId,
        status: { notIn: ['COMPLETED', 'SKIPPED'] },
      },
    })

    if (remaining === 0) {
      await tx.employeeOnboarding.update({
        where: { id: task.onboardingId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      if (task.onboarding.type === 'OFFBOARDING') {
        const emp = task.onboarding.employee
        await tx.employee.update({
          where: { id: emp.id },
          data: { isActive: false },
        })
        await tx.user.update({
          where: { id: emp.userId },
          data: { isActive: false, tokenVersion: { increment: 1 } },
        })
      }
    }
  })

  await logAudit({
    actorId: session.user.id,
    action: 'ONBOARDING_TASK_SKIPPED',
    entityType: 'EmployeeOnboardingTask',
    entityId: taskId,
    detail: { onboardingId: task.onboardingId },
  })

  revalidatePath('/en/onboarding')
  revalidatePath(`/en/manager/${task.onboarding.type.toLowerCase()}/${task.onboardingId}`)
  return { success: true }
}

export async function checkOverdueTasks() {
  const now = new Date()

  const updated = await db.employeeOnboardingTask.updateMany({
    where: {
      status: 'PENDING',
      deadline: { lt: now },
    },
    data: { status: 'OVERDUE' },
  })

  const overdueTasks = await db.employeeOnboardingTask.findMany({
    where: {
      status: 'OVERDUE',
    },
    include: {
      taskTemplate: true,
      onboarding: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  })

  if (updated.count > 0) {
    await logAudit({
      action: 'ONBOARDING_TASKS_OVERDUE',
      entityType: 'EmployeeOnboardingTask',
      detail: { count: updated.count },
    })
  }

  return overdueTasks
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
