import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import { resolvePrivateUploadPath } from '@/lib/upload'
import { isApprover } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const type = req.nextUrl.searchParams.get('type') ?? 'employee'

  let doc: { fileName: string; filePath: string; fileType: string } | null = null
  if (type === 'company') {
    doc = await db.companyDocument.findUnique({ where: { id } })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } else {
    const employeeDoc = await db.employeeDocument.findUnique({
      where: { id },
      include: { employee: { select: { userId: true } } },
    })
    if (!employeeDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isOwner = employeeDoc.employee?.userId === session.user.id
    if (!isOwner && !isApprover(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    doc = employeeDoc
  }

  const relativeKey = doc.filePath.replace(/^\/uploads\//, '')
  const fullPath = resolvePrivateUploadPath(relativeKey)
  if (!fullPath) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const buffer = await readFile(fullPath)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': doc.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.fileName.replace(/["\r\n]/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
