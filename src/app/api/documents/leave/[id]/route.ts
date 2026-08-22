import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { resolvePrivateUploadPath } from '@/lib/upload'
import { isApprover } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const leave = await db.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { userId: true } } },
  })
  if (!leave?.attachmentFile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = leave.employee?.userId === session.user.id
  if (!isOwner && !isApprover(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const relativeKey = leave.attachmentFile.replace(/^\/uploads\//, '')
  const fullPath = resolvePrivateUploadPath(relativeKey)
  if (!fullPath) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const buffer = await readFile(fullPath)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${basename(relativeKey).replace(/["\r\n]/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
