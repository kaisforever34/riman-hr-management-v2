'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createExpenseSchema, reviewExpenseSchema, updateExpenseSchema } from '@/lib/validations/expense'
import { isApprover } from '@/lib/roles'
import { logAudit } from '@/lib/audit'

export async function createExpense(raw: Record<string, unknown>) {
  const parsed = createExpenseSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const first = Object.values(errors).flat()[0]
    return { error: first || 'Invalid input' }
  }

  const session = await auth()
  if (!session?.user) return { error: await serverError('unauthorized') }

  let employeeId = parsed.data.employeeId
  if (employeeId) {
    if (!isApprover(session.user.role)) return { error: await serverError('unauthorized') }
    const emp = await db.employee.findUnique({ where: { id: employeeId } })
    if (!emp) return { error: await serverError('employeeNotFound') }
  } else {
    const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
    if (!employee) return { error: await serverError('employeeNotFound') }
    employeeId = employee.id
  }

  const expense = await db.expense.create({
    data: {
      employeeId,
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description || null,
    },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EXPENSE_CREATED',
    entityType: 'Expense',
    entityId: expense.id,
    detail: { employeeId, title: parsed.data.title, amount: parsed.data.amount },
  })

  revalidatePath('/expenses')
  revalidatePath('/manager/expenses')
  return { id: expense.id }
}

export async function updateExpense(raw: Record<string, unknown>) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const parsed = updateExpenseSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const first = Object.values(errors).flat()[0]
    return { error: first || 'Invalid input' }
  }

  const existing = await db.expense.findUnique({ where: { id: parsed.data.id } })
  if (!existing) return { error: await serverError('invalidRequest') }

  await db.expense.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description || null,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EXPENSE_UPDATED',
    entityType: 'Expense',
    entityId: parsed.data.id,
    detail: { title: parsed.data.title, amount: parsed.data.amount },
  })

  revalidatePath('/manager/expenses')
  return { success: true }
}

export async function deleteExpense(id: string) {
  const session = await auth()
  if (!session?.user || !isApprover(session.user.role)) return { error: await serverError('unauthorized') }

  const existing = await db.expense.findUnique({ where: { id } })
  if (!existing) return { error: await serverError('invalidRequest') }

  await db.expense.delete({ where: { id } })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EXPENSE_DELETED',
    entityType: 'Expense',
    entityId: id,
    detail: { title: existing.title },
  })

  revalidatePath('/manager/expenses')
  return { success: true }
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
