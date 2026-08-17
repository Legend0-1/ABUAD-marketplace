import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { title, body, serviceChargePercent, notifySellers } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const current = await db.agreement.findFirst({ where: { isActive: true } })
  const [major, minor] = (current?.version || '1.0').split('.').map(Number)
  const newVersion = `${major}.${(minor || 0) + 1}`

  await db.agreement.updateMany({ where: { isActive: true }, data: { isActive: false } })
  const updated = await db.agreement.create({
    data: {
      version: newVersion,
      title: title.trim(),
      body: body.trim(),
      serviceChargePercent: serviceChargePercent ?? current?.serviceChargePercent ?? 20,
      isActive: true,
    },
  })

  await logAudit({ actor: admin, action: 'agreement.update', targetType: 'Agreement', targetId: updated.id, detail: `Published v${newVersion}` })

  if (notifySellers) {
    // Notify every seller with an active storefront via the existing admin
    // broadcast/inbox system -- the agreement itself promises 7 days' notice
    // before a revision takes effect.
    const sellers = await db.storefront.findMany({ where: { status: { in: ['active', 'pending_approval'] } }, select: { ownerId: true } })
    const uniqueOwnerIds = Array.from(new Set(sellers.map((s) => s.ownerId)))
    for (const ownerId of uniqueOwnerIds) {
      let conv = await db.conversation.findFirst({
        where: { type: 'admin_direct', participantAId: admin.id, participantBId: ownerId },
      })
      if (!conv) {
        conv = await db.conversation.create({
          data: { type: 'admin_direct', participantAId: admin.id, participantBId: ownerId, subject: 'Seller Agreement updated' },
        })
      }
      await db.message.create({
        data: {
          conversationId: conv.id,
          senderId: admin.id,
          body: `The Seller Agreement has been updated to v${newVersion}. Changes take effect in 7 days. Please review it from your storefront dashboard.`,
        },
      })
    }
  }

  return NextResponse.json({ agreement: updated })
}
