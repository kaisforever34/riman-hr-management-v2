'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { sendEmail, renderEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

const EMAIL_TYPES = new Set(['LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'ONBOARDING_TASK'])

async function emailUsers(userIds: string[], type: string, title: string, message?: string) {
  if (!EMAIL_TYPES.has(type)) return
  const users = await db.user.findMany({ where: { id: { in: userIds }, isActive: true }, select: { email: true } })
  await Promise.all(users.map((u) => sendEmail({ to: u.email, subject: title, html: renderEmail(title, message ? [message] : []) })))
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message?: string,
  link?: string,
) {
  await db.notification.create({
    data: { userId, type, title, message: message ?? null, link: link ?? null },
  })
  void emailUsers([userId], type, title, message).catch((e) =>
    logger.error('email fanout failed', { type, error: String(e) })
  )
}

export async function createNotifications(
  userIds: string[],
  type: string,
  title: string,
  message?: string,
  link?: string,
) {
  if (userIds.length === 0) return
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      message: message ?? null,
      link: link ?? null,
    })),
  })
  void emailUsers(userIds, type, title, message).catch((e) =>
    logger.error('email fanout failed', { type, error: String(e) })
  )
}

export async function getApproverUserIds(employeeId: string): Promise<string[]> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { manager: { include: { user: { select: { id: true, isActive: true } } } } },
  })

  const userIds: string[] = []
  if (employee?.manager?.user?.isActive) userIds.push(employee.manager.user.id)

  const admins = await db.user.findMany({
    where: { role: 'HR_ADMIN', isActive: true },
    select: { id: true },
  })
  for (const admin of admins) {
    if (!userIds.includes(admin.id)) userIds.push(admin.id)
  }

  if (userIds.length === 0) {
    const managers = await db.user.findMany({
      where: { role: 'MANAGER', isActive: true },
      select: { id: true },
    })
    userIds.push(...managers.map((m) => m.id))
  }

  return userIds
}

export async function getUnreadCount() {
  const session = await auth()
  if (!session?.user) return { count: 0, recent: [] }

  const [count, recent] = await Promise.all([
    db.notification.count({ where: { userId: session.user.id, isRead: false } }),
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return { count, recent: JSON.parse(JSON.stringify(recent)) }
}

export async function getNotifications(page = 1, unreadOnly = false) {
  const session = await auth()
  if (!session?.user) return { notifications: [], total: 0 }

  const where = { userId: session.user.id, ...(unreadOnly ? { isRead: false } : {}) }
  const pageSize = 20

  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notification.count({ where }),
  ])

  return { notifications: JSON.parse(JSON.stringify(notifications)), total }
}

export async function markAsRead(id: string) {
  const session = await auth()
  if (!session?.user) return

  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  })
  revalidatePath('/notifications')
}

export async function markAllAsRead() {
  const session = await auth()
  if (!session?.user) return

  await db.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })
  revalidatePath('/notifications')
}
