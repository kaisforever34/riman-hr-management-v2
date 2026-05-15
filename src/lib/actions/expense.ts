'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createExpense(data: {
  title: string
  amount: number
  category: string
  description?: string
}) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: 'Employee not found' }

  const expense = await db.expense.create({
    data: {
      employeeId: employee.id,
      title: data.title,
      amount: data.amount,
      category: data.category,
      description: data.description || null,
    },
  })

  revalidatePath('/expenses')
  return { id: expense.id }
}

export async function getMyExpenses() {
  const session = await auth()
  if (!session?.user) return []

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return []

  return db.expense.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getExpenses() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return []
  }

  return db.expense.findMany({
    include: {
      employee: { select: { firstName: true, lastName: true, department: true } },
      reviewedBy: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getExpenseDetail(id: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return null
  }

  return db.expense.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true, department: true } },
      reviewedBy: { select: { email: true } },
    },
  })
}

export async function reviewExpense(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  await db.expense.update({
    where: { id },
    data: {
      status,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      rejectionReason: status === 'REJECTED' ? (rejectionReason || null) : null,
    },
  })

  revalidatePath('/manager/expenses')
  return { success: true }
}
