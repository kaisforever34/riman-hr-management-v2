'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { uploadEmployeeDocumentSchema, uploadCompanyDocumentSchema, deleteDocumentSchema } from '@/lib/validations/document'
import { uploadDocument } from '@/lib/document-upload'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function uploadEmployeeDoc(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')) return { error: await serverError('unauthorized') }

  const parsed = uploadEmployeeDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidInput'), fieldErrors: parsed.error.flatten().fieldErrors }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: await serverError('fileRequired') }

  const filePath = await uploadDocument(file, 'employees')
  if (!filePath) return { error: await serverError('invalidDocumentFile') }

  await db.employeeDocument.create({
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

  await db.companyDocument.create({
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
    const fullPath = join(process.cwd(), 'public', doc.filePath)
    await unlink(fullPath)
  } catch {
    // File may not exist on disk — still remove DB record
  }

  if (type === 'employee') {
    await db.employeeDocument.delete({ where: { id } })
  } else {
    await db.companyDocument.delete({ where: { id } })
  }

  revalidatePath('/manager/documents')
}
