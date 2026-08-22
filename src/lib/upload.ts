import { writeFile, mkdir } from 'fs/promises'
import { join, resolve, relative } from 'path'

export const PRIVATE_UPLOAD_ROOT = join(process.cwd(), 'private-uploads')

export function resolvePrivateUploadPath(key: string): string | null {
  const fullPath = resolve(join(PRIVATE_UPLOAD_ROOT, key))
  const rel = relative(resolve(PRIVATE_UPLOAD_ROOT), fullPath)
  if (rel.startsWith('..') || resolve(PRIVATE_UPLOAD_ROOT) === fullPath) return null
  return fullPath
}

const UPLOAD_DIR = join(PRIVATE_UPLOAD_ROOT, 'leaves')
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export async function uploadLeaveAttachment(file: File): Promise<string | null> {
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) return null
  if (file.size > MAX_SIZE) return null

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), buffer)

  return `leaves/${filename}`
}
