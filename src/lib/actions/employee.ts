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

  try {
    await db.user.create({
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
    const isUniqueViolation = typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002'
    if (isUniqueViolation) {
      return { error: await serverError('emailOrCodeExists'), fieldErrors: {} }
    }
    throw e
  }

  revalidatePath('/employees')
  redirect('/employees')
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
  revalidatePath('/employees')
}
