'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

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
