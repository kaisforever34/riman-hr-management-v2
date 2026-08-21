'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createExpenseSchema, reviewExpenseSchema } from '@/lib/validations/expense'

export async function createExpense(raw: Record<string, unknown>) {
  const parsed = createExpenseSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const first = Object.values(errors).flat()[0]
    return { error: first || 'Invalid input' }
  }

  const session = await auth()
  if (!session?.user) return { error: await serverError('unauthorized') }

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return { error: await serverError('employeeNotFound') }

  const expense = await db.expense.create({
    data: {
      employeeId: employee.id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description || null,
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

  const expenses = await db.expense.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
  })

  return expenses.map((e) => ({ ...e, amount: Number(e.amount) }))
}

export async function getExpenses() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return []
  }

  const expenses = await db.expense.findMany({
    include: {
      employee: { select: { firstName: true, lastName: true, department: true } },
      reviewedBy: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return expenses.map((e) => ({ ...e, amount: Number(e.amount) }))
}

export async function getExpenseDetail(id: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return null
  }

  const expense = await db.expense.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true, department: true } },
      reviewedBy: { select: { email: true } },
    },
  })

  if (!expense) return null
  return { ...expense, amount: Number(expense.amount) }
}

export async function reviewExpense(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  const parsed = reviewExpenseSchema.safeParse({ id, status, rejectionReason })
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const first = Object.values(errors).flat()[0]
    return { error: first || 'Invalid input' }
  }

  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: await serverError('unauthorized') }
  }

  await db.expense.update({
    where: { id },
    data: {
      status,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      rejectionReason: parsed.data.status === 'REJECTED' ? (parsed.data.rejectionReason || null) : null,
    },
  })

  revalidatePath('/manager/expenses')
  return { success: true }
}
