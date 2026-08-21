'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { uploadEmployeeDocumentSchema, uploadCompanyDocumentSchema, deleteDocumentSchema } from '@/lib/validations/document'
import { uploadDocument } from '@/lib/document-upload'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { logAudit } from '@/lib/audit'

export async function uploadEmployeeDoc(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: await serverError('unauthorized') }

  const parsed = uploadEmployeeDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidInput'), fieldErrors: parsed.error.flatten().fieldErrors }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: await serverError('fileRequired') }

  const filePath = await uploadDocument(file, 'employees')
  if (!filePath) return { error: await serverError('invalidDocumentFile') }

  const doc = await db.employeeDocument.create({
    data: {
      employeeId: parsed.data.employeeId,
      category: parsed.data.category,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      fileType: file.type,
      notes: parsed.data.notes || null,
      uploadedById: session.user.id,
    },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'DOCUMENT_UPLOADED',
    entityType: 'EmployeeDocument',
    entityId: doc.id,
  })

  revalidatePath('/manager/documents')
}

export async function uploadCompanyDoc(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: await serverError('unauthorized') }

  const parsed = uploadCompanyDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidInput'), fieldErrors: parsed.error.flatten().fieldErrors }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: await serverError('fileRequired') }

  const filePath = await uploadDocument(file, 'company')
  if (!filePath) return { error: await serverError('invalidDocumentFile') }

  const doc = await db.companyDocument.create({
    data: {
      category: parsed.data.category,
      title: parsed.data.title,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      fileType: file.type,
      notes: parsed.data.notes || null,
      uploadedById: session.user.id,
    },
  })

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'DOCUMENT_UPLOADED',
    entityType: 'CompanyDocument',
    entityId: doc.id,
  })

  revalidatePath('/manager/documents')
}

export async function deleteDocument(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: await serverError('unauthorized') }

  const parsed = deleteDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  const { id, type } = parsed.data
  const doc = type === 'employee'
    ? await db.employeeDocument.findUnique({ where: { id } })
    : await db.companyDocument.findUnique({ where: { id } })

  if (!doc) return { error: await serverError('documentNotFound') }

  try {
    const key = doc.filePath.replace(/^\/uploads\//, '')
    const fullPath = join(process.cwd(), 'private-uploads', key)
    await unlink(fullPath)
  } catch {
    // File may not exist on disk — still remove DB record
  }

  if (type === 'employee') {
    await db.employeeDocument.delete({ where: { id } })
  } else {
    await db.companyDocument.delete({ where: { id } })
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: 'DOCUMENT_DELETED',
    entityType: type === 'employee' ? 'EmployeeDocument' : 'CompanyDocument',
    entityId: id,
  })

  revalidatePath('/manager/documents')
}
