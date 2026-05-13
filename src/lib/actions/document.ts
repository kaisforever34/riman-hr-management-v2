'use server'

import { db } from '@/lib/db'
import { uploadEmployeeDocumentSchema, uploadCompanyDocumentSchema, deleteDocumentSchema } from '@/lib/validations/document'
import { uploadDocument } from '@/lib/document-upload'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function uploadEmployeeDoc(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = uploadEmployeeDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'File is required' }

  const filePath = await uploadDocument(file, 'employees')
  if (!filePath) return { error: 'Invalid file (max 10MB, PDF/JPG/PNG/DOC/DOCX only)' }

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
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = uploadCompanyDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'File is required' }

  const filePath = await uploadDocument(file, 'company')
  if (!filePath) return { error: 'Invalid file (max 10MB, PDF/JPG/PNG/DOC/DOCX only)' }

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
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = deleteDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request' }

  const { id, type } = parsed.data
  const doc = type === 'employee'
    ? await db.employeeDocument.findUnique({ where: { id } })
    : await db.companyDocument.findUnique({ where: { id } })

  if (!doc) return { error: 'Document not found' }

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
