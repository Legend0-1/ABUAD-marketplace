import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminOrHR } from '@/lib/session'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let actor
  try {
    actor = await requireAdminOrHR()
  } catch {
    return NextResponse.json({ error: 'Admin or HR only' }, { status: 403 })
  }

  const { action } = await req.json() // "approve" | "reject" | "suspend"
  const statusMap: Record<string, string> = { approve: 'approved', reject: 'rejected', suspend: 'suspended' }
  const newStatus = statusMap[action]
  if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const profile = await db.deliveryPartnerProfile.update({
    where: { id },
    data: { status: newStatus, reviewedById: actor.id, reviewedAt: new Date() },
    include: { user: { select: { id: true, fullName: true } } },
  })

  // Suspension also revokes Type-A eligibility -- a suspended partner shouldn't
  // still be trusted with upfront item-cost payouts.
  if (newStatus === 'suspended' && profile.typeAEligible) {
    await db.deliveryPartnerProfile.update({ where: { id }, data: { typeAEligible: false } })
  }

  await logAudit({ actor, action: `delivery_partner.${action}`, targetType: 'DeliveryPartnerProfile', targetId: id, detail: `${profile.user.fullName} → ${newStatus}` })

  return NextResponse.json({ profile })
}
