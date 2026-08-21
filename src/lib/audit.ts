import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export type AuditEntry = {
  actorId?: string
  actorEmail?: string
  action: string
  entityType: string
  entityId?: string
  detail?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        detail: (entry.detail ?? undefined) as undefined,
      },
    })
  } catch (e) {
    logger.error('audit write failed', { action: entry.action, error: String(e) })
  }
}
