import { db } from '@/lib/db'
import type { AuditLog } from '@prisma/client'

export async function getAuditLogs(take = 200): Promise<AuditLog[]> {
  return db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take })
}
