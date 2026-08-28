import { writeFile, mkdir } from 'fs/promises'
import { join, resolve, relative } from 'path'
import { getNumericSetting } from '@/lib/queries/app-settings'

export const PRIVATE_UPLOAD_ROOT = join(process.cwd(), 'private-uploads')

export function resolvePrivateUploadPath(key: string): string | null {
  const fullPath = resolve(join(PRIVATE_UPLOAD_ROOT, key))
  const rel = relative(resolve(PRIVATE_UPLOAD_ROOT), fullPath)
  if (rel.startsWith('..') || resolve(PRIVATE_UPLOAD_ROOT) === fullPath) return null
  return fullPath
}

const UPLOAD_DIR = join(PRIVATE_UPLOAD_ROOT, 'leaves')
const DEFAULT_MAX_MB = 5
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export async function uploadLeaveAttachment(file: File): Promise<string | null> {
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) return null
  const maxMb = await getNumericSetting('MAX_LEAVE_ATTACHMENT_MB')
  const maxSize = (maxMb > 0 ? maxMb : DEFAULT_MAX_MB) * 1024 * 1024
  if (file.size > maxSize) return null

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), buffer)

  return `leaves/${filename}`
}
