'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { employeeFormSchema } from '@/lib/validations/employee'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Role } from '@/lib/types'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { isUniqueConstraintError } from '@/lib/db-errors'
import { getAppSetting } from '@/lib/queries/payroll'

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
            gender: data.gender || null,
            nationality: data.nationality,
            maritalStatus: data.maritalStatus || null,
            phoneNumber: data.phoneNumber || null,
            jobTitle: data.jobTitle,
            department: data.department,
            hireDate: new Date(data.hireDate),
            salary: parseFloat(data.salary),
            basicSalary: data.basicSalary ? parseFloat(data.basicSalary) : 0,
            housingAllowance: data.housingAllowance ? parseFloat(data.housingAllowance) : 0,
            transportAllowance: data.transportAllowance ? parseFloat(data.transportAllowance) : 0,
            otherAllowances: data.otherAllowances ? parseFloat(data.otherAllowances) : 0,
            bankName: data.bankName || null,
            iban: data.iban || null,
            swift: data.swift || null,
            emergencyContactName: data.emergencyContactName || null,
            emergencyContactPhone: data.emergencyContactPhone || null,
            workWeek: JSON.stringify(data.workWeek),
            contractType: data.contractType || null,
            contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
            contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
            probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null,
            visaExpiryDate: data.visaExpiryDate ? new Date(data.visaExpiryDate) : null,
            iqamaNumber: data.iqamaNumber || null,
            iqamaExpiryDate: data.iqamaExpiryDate ? new Date(data.iqamaExpiryDate) : null,
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

export async function reactivateEmployee(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const employeeUserId = formData.get('userId') as string
  if (!employeeUserId) return { error: await serverError('invalidRequest') }

  const user = await db.user.findUnique({ where: { id: employeeUserId }, include: { employee: true } })
  if (!user) return { error: await serverError('employeeNotFound') }

  await db.$transaction([
    db.user.update({ where: { id: employeeUserId }, data: { isActive: true, tokenVersion: { increment: 1 } } }),
    ...(user.employee ? [db.employee.update({ where: { id: user.employee.id }, data: { isActive: true } })] : []),
  ])

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EMPLOYEE_REACTIVATED',
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

  await db.employee.update({ where: { id: employeeId }, data: { workWeek: JSON.stringify(parsed.data) } })

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

export async function updateEmployee(employeeId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: await serverError('unauthorized') }
  }

  const raw = Object.fromEntries(formData.entries())

  const parsed = z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phoneNumber: z.string().optional(),
    jobTitle: z.string().min(1).max(100),
    department: z.string().min(1),
    nationality: z.string().min(1),
    dateOfBirth: z.string().min(1),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    managerId: z.string().optional(),
    bankName: z.string().optional(),
    iban: z.string().optional(),
    swift: z.string().optional(),
    salary: z.string().min(1).regex(/^\d+(\.\d{1,2})?$/, 'Invalid format'),
    basicSalary: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid format').optional().or(z.literal('')),
    housingAllowance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid format').optional().or(z.literal('')),
    transportAllowance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid format').optional().or(z.literal('')),
    otherAllowances: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid format').optional().or(z.literal('')),
    contractType: z.string().optional(),
    contractStartDate: z.string().optional(),
    contractEndDate: z.string().optional(),
    probationEndDate: z.string().optional(),
    visaExpiryDate: z.string().optional(),
    iqamaNumber: z.string().optional(),
    iqamaExpiryDate: z.string().optional(),
  }).safeParse(raw)

  if (!parsed.success) {
    return {
      error: await serverError('validationFailed'),
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data

  const employee = await db.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return { error: await serverError('employeeNotFound') }

  await db.employee.update({
    where: { id: employeeId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber || null,
      jobTitle: data.jobTitle,
      department: data.department,
      nationality: data.nationality,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender || null,
      maritalStatus: data.maritalStatus || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      managerId: data.managerId || null,
      bankName: data.bankName || null,
      iban: data.iban || null,
      swift: data.swift || null,
      salary: parseFloat(data.salary),
      basicSalary: data.basicSalary ? parseFloat(data.basicSalary) : 0,
      housingAllowance: data.housingAllowance ? parseFloat(data.housingAllowance) : 0,
      transportAllowance: data.transportAllowance ? parseFloat(data.transportAllowance) : 0,
      otherAllowances: data.otherAllowances ? parseFloat(data.otherAllowances) : 0,
      contractType: data.contractType || null,
      contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
      probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null,
      visaExpiryDate: data.visaExpiryDate ? new Date(data.visaExpiryDate) : null,
      iqamaNumber: data.iqamaNumber || null,
      iqamaExpiryDate: data.iqamaExpiryDate ? new Date(data.iqamaExpiryDate) : null,
    },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'Employee',
    entityId: employeeId,
  })

  revalidatePath('/employees')
  revalidatePath(`/employees/${employeeId}`)
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

export async function forgotPassword(email: string) {
  if (!email || typeof email !== 'string') {
    return { error: await serverError('invalidInput') }
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) {
    return { error: await serverError('userNotFound') }
  }

  const rawPassword = crypto.randomBytes(12).toString('base64url').slice(0, 16)
  const passwordHash = await bcrypt.hash(rawPassword, 10)

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  })

  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityId: user.id,
  })

  return { success: true, newPassword: rawPassword }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: await serverError('unauthorized') }
  }

  if (!currentPassword || !newPassword) {
    return { error: await serverError('invalidInput') }
  }

  if (newPassword.length < 8) {
    return { error: await serverError('invalidInput') }
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return { error: await serverError('userNotFound') }
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return { error: await serverError('passwordChangeFailed') }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityId: user.id,
  })

  return { success: true }
}

export async function getContractExpiringSoon(days: number = 30) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: await serverError('unauthorized') }
  }

  const now = new Date()
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + days)

  const employees = await db.employee.findMany({
    where: {
      isActive: true,
      contractEndDate: { not: null, gte: now, lte: deadline },
    },
    include: { user: { select: { email: true, role: true } } },
    orderBy: { contractEndDate: 'asc' },
  })

  return employees.map((emp) => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    employeeCode: emp.employeeCode,
    jobTitle: emp.jobTitle,
    department: emp.department,
    contractType: emp.contractType,
    contractEndDate: emp.contractEndDate,
    daysUntilExpiry: Math.ceil((emp.contractEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  }))
}

export async function getVisaExpiringSoon(days: number = 30) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: await serverError('unauthorized') }
  }

  const now = new Date()
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + days)

  const employees = await db.employee.findMany({
    where: {
      isActive: true,
      OR: [
        { visaExpiryDate: { not: null, gte: now, lte: deadline } },
        { iqamaExpiryDate: { not: null, gte: now, lte: deadline } },
      ],
    },
    include: { user: { select: { email: true, role: true } } },
    orderBy: { visaExpiryDate: 'asc' },
  })

  return employees.map((emp) => {
    const expiryDate = emp.visaExpiryDate && emp.iqamaExpiryDate
      ? emp.visaExpiryDate < emp.iqamaExpiryDate
        ? emp.visaExpiryDate
        : emp.iqamaExpiryDate
      : emp.visaExpiryDate || emp.iqamaExpiryDate

    return {
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      employeeCode: emp.employeeCode,
      jobTitle: emp.jobTitle,
      department: emp.department,
      visaExpiryDate: emp.visaExpiryDate,
      iqamaNumber: emp.iqamaNumber,
      iqamaExpiryDate: emp.iqamaExpiryDate,
      daysUntilExpiry: expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
    }
  })
}

export async function terminateEmployee(employeeId: string, terminationDate: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: await serverError('unauthorized') }
  }

  if (!employeeId || !terminationDate) {
    return { error: await serverError('invalidInput') }
  }

  const employee = await db.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return { error: await serverError('employeeNotFound') }

  const termDate = new Date(terminationDate)
  const hireDate = new Date(employee.hireDate)
  const yearsOfService = (termDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

  const monthlySalary = employee.basicSalary || employee.salary
  const dailySalary = monthlySalary / 30

  const eosbCapMonths = await getAppSetting('EOSB_CAP_MONTHS')
  const maxEosbMonths = eosbCapMonths ? parseFloat(eosbCapMonths) : 24

  let eosbAmount = 0
  if (yearsOfService > 0) {
    if (yearsOfService <= 5) {
      eosbAmount = dailySalary * 21 * yearsOfService
    } else {
      const firstFiveYears = dailySalary * 21 * 5
      const remainingYears = yearsOfService - 5
      const additionalDays = dailySalary * 30 * remainingYears
      const maxEosb = monthlySalary * maxEosbMonths
      eosbAmount = Math.min(firstFiveYears + additionalDays, maxEosb)
    }
  }

  const totalSalary = (employee.basicSalary || 0) +
    (employee.housingAllowance || 0) +
    (employee.transportAllowance || 0) +
    (employee.otherAllowances || 0)

  await db.$transaction([
    db.employee.update({
      where: { id: employeeId },
      data: { isActive: false, terminationDate: termDate },
    }),
    db.user.update({
      where: { id: employee.userId },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    }),
    db.eosbRecord.create({
      data: {
        employeeId,
        terminationDate: termDate,
        yearsOfService: Math.round(yearsOfService * 100) / 100,
        lastSalary: totalSalary,
        eosbAmount: Math.round(eosbAmount * 100) / 100,
      },
    }),
  ])

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'EMPLOYEE_TERMINATED',
    entityType: 'Employee',
    entityId: employeeId,
    detail: { terminationDate: termDate.toISOString(), eosbAmount },
  })

  revalidatePath('/employees')
  revalidatePath(`/employees/${employeeId}`)
  revalidatePath('/payroll')
  revalidatePath('/manager/terminations')

  return { success: true, eosbAmount, yearsOfService: Math.round(yearsOfService * 100) / 100 }
}
