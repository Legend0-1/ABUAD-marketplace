import { db } from '@/lib/db'

type AuditActor = { id: string; fullName: string; isAdmin?: boolean } | null

/**
 * Records an accountability entry for an admin or user action.
 * Never throws -- a logging failure should never block the action itself.
 */
export async function logAudit(params: {
  actor: AuditActor
  action: string
  targetType?: string
  targetId?: string
  detail?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actor?.id || null,
        actorLabel: params.actor ? `${params.actor.fullName}${params.actor.isAdmin ? ' (admin)' : ''}` : 'System',
        action: params.action,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        detail: params.detail || null,
      },
    })
  } catch (e) {
    console.error('audit log write failed', e)
  }
}
