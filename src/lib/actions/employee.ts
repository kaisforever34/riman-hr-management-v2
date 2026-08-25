'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { employeeFormSchema } from '@/lib/validations/employee'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { isUniqueConstraintError } from '@/lib/db-errors'

export async function createEmployee(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: await serverError('unauthorized') }
  }

  const raw = { ...Object.fromEntries(formData.entries()), workWeek: formData.getAll('workWeek') }

  const parsed = employeeFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      error: await serverError('validationFailed'),
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data

  const existingEmail = await db.user.findUnique({ where: { email: data.email } })
  if (existingEmail) {
    return { error: await serverError('emailExists'), fieldErrors: {} }
  }

  const existingCode = await db.employee.findUnique({ where: { employeeCode: data.employeeCode } })
  if (existingCode) {
    return { error: await serverError('codeExists'), fieldErrors: {} }
  }

  const passwordHash = await bcrypt.hash(data.password, 10)

  let created
  try {
    created = await db.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role as Role,
        employee: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            employeeCode: data.employeeCode,
            dateOfBirth: new Date(data.dateOfBirth),
            nationality: data.nationality,
            maritalStatus: data.maritalStatus || null,
            phoneNumber: data.phoneNumber || null,
            jobTitle: data.jobTitle,
            department: data.department,
            hireDate: new Date(data.hireDate),
            salary: parseFloat(data.salary),
            bankName: data.bankName || null,
            iban: data.iban || null,
            swift: data.swift || null,
            emergencyContactName: data.emergencyContactName || null,
            emergencyContactPhone: data.emergencyContactPhone || null,
            workWeek: data.workWeek,
          },
        },
      },
    })
  } catch (e) {
    const isUniqueViolation = isUniqueConstraintError(e)
    if (isUniqueViolation) {
      return { error: await serverError('emailOrCodeExists'), fieldErrors: {} }
    }
    throw e
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EMPLOYEE_CREATED',
    entityType: 'Employee',
    entityId: created.id,
  })

  revalidatePath('/employees')
  redirect('/employees')
}

export async function deactivateEmployee(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const employeeUserId = formData.get('userId') as string
  if (!employeeUserId) return { error: await serverError('invalidRequest') }
  if (employeeUserId === session.user.id) return { error: await serverError('invalidRequest') }

  const user = await db.user.findUnique({ where: { id: employeeUserId }, include: { employee: true } })
  if (!user) return { error: await serverError('employeeNotFound') }

  await db.$transaction([
    db.user.update({ where: { id: employeeUserId }, data: { isActive: false, tokenVersion: { increment: 1 } } }),
    ...(user.employee ? [db.employee.update({ where: { id: user.employee.id }, data: { isActive: false } })] : []),
  ])

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EMPLOYEE_DEACTIVATED',
    entityType: 'User',
    entityId: employeeUserId,
  })

  revalidatePath('/employees')
}

export async function resetPassword(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const targetUserId = formData.get('userId') as string
  if (!targetUserId || targetUserId === session.user.id) return { error: await serverError('invalidRequest') }

  const user = await db.user.findUnique({ where: { id: targetUserId } })
  if (!user) return { error: await serverError('userNotFound') }

  const newPassword = formData.get('password') as string || undefined
  if (newPassword && newPassword.length < 8) return { error: await serverError('invalidInput') }

  const passwordHash = newPassword
    ? await bcrypt.hash(newPassword, 10)
    : await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)

  await db.user.update({
    where: { id: targetUserId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityId: targetUserId,
  })

  revalidatePath('/employees')
}

export async function updateEmployeeWorkWeek(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const employeeId = formData.get('employeeId') as string
  const days = formData.getAll('workWeek').map(Number)
  const parsed = z.array(z.number().int().min(0).max(6)).min(1).safeParse(days)
  if (!parsed.success || !employeeId) return { error: await serverError('invalidInput') }

  const emp = await db.employee.findUnique({ where: { id: employeeId } })
  if (!emp) return { error: await serverError('employeeNotFound') }

  await db.employee.update({ where: { id: employeeId }, data: { workWeek: parsed.data } })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'Employee',
    entityId: employeeId,
    detail: { workWeek: parsed.data },
  })

  revalidatePath('/employees')
}

export async function createUser(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const email = (formData.get('email') as string).toLowerCase().trim()
  const password = formData.get('password') as string
  const role = formData.get('role') as Role
  const employeeId = formData.get('employeeId') as string

  if (!email || !role) return { error: await serverError('invalidInput') }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { error: await serverError('emailExists') }

  const passwordHash = password
    ? await bcrypt.hash(password, 10)
    : await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)

  const generatedPassword = password ? password : Math.random().toString(36).slice(2, 10)

  const user = await db.user.create({
    data: { email, passwordHash, role },
    include: { employee: true },
  })

  const linkedEmployeeId = employeeId ? (await db.employee.findUnique({ where: { id: employeeId } }))?.id : null
  if (linkedEmployeeId) {
    await db.employee.update({ where: { id: linkedEmployeeId }, data: { userId: user.id } })
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: user.id,
  })

  return { id: user.id, email: user.email, role: user.role, generatedPassword, linkedEmployeeId }
}
