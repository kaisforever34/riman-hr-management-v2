'use server'

import { db } from '@/lib/db'
import { employeeFormSchema } from '@/lib/validations/employee'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

export async function createEmployee(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())

  const parsed = employeeFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data

  const existingEmail = await db.user.findUnique({ where: { email: data.email } })
  if (existingEmail) {
    return { error: 'An employee with this email already exists.', fieldErrors: {} }
  }

  const existingCode = await db.employee.findUnique({ where: { employeeCode: data.employeeCode } })
  if (existingCode) {
    return { error: 'An employee with this code already exists.', fieldErrors: {} }
  }

  try {
    const passwordHash = await bcrypt.hash(data.password, 10)

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
          },
        },
      },
    })
  } catch {
    return { error: 'Something went wrong. Please try again.', fieldErrors: {} }
  }

  revalidatePath('/employees')
  redirect('/employees')
}
