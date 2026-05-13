import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'leaves')
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export async function uploadLeaveAttachment(file: File): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type)) return null
  if (file.size > MAX_SIZE) return null

  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), buffer)

  return `/uploads/leaves/${filename}`
}
