import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { PRIVATE_UPLOAD_ROOT } from './upload'
import { getNumericSetting } from '@/lib/queries/app-settings'

const BASE_DIR = join(PRIVATE_UPLOAD_ROOT, 'documents')
const DEFAULT_MAX_MB = 10
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export async function uploadDocument(file: File, subDir: 'employees' | 'company'): Promise<string | null> {
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) return null
  const maxMb = await getNumericSetting('MAX_DOCUMENT_MB')
  const maxSize = (maxMb > 0 ? maxMb : DEFAULT_MAX_MB) * 1024 * 1024
  if (file.size > maxSize) return null

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const dir = join(BASE_DIR, subDir)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), buffer)

  return `documents/${subDir}/${filename}`
}
