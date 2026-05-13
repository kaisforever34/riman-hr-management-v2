import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const BASE_DIR = join(process.cwd(), 'public', 'uploads', 'documents')
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export async function uploadDocument(file: File, subDir: 'employees' | 'company'): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type)) return null
  if (file.size > MAX_SIZE) return null

  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const dir = join(BASE_DIR, subDir)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), buffer)

  return `/uploads/documents/${subDir}/${filename}`
}
