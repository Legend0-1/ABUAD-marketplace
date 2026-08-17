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

  const { partnerId } = await req.json()
  const request = await db.deliveryRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (request.status !== 'pending_hr') {
    return NextResponse.json({ error: `This request is not awaiting assignment (currently ${request.status})` }, { status: 400 })
  }

  const partner = await db.deliveryPartnerProfile.findUnique({ where: { id: partnerId } })
  if (!partner || partner.status !== 'approved') {
    return NextResponse.json({ error: 'That partner is not approved' }, { status: 400 })
  }
  if (request.type === 'buy_and_deliver' && !partner.typeAEligible) {
    return NextResponse.json({
      error: 'This partner is not yet approved for buy-and-deliver jobs (requires separate Type-A approval, since it involves an upfront payout). Assign an eligible partner, or grant this partner Type-A eligibility first.',
    }, { status: 400 })
  }

  const updated = await db.deliveryRequest.update({
    where: { id },
    data: { partnerId, assignedById: actor.id, status: 'awaiting_partner' },
  })

  await logAudit({ actor, action: 'delivery_request.assigned', targetType: 'DeliveryRequest', targetId: id, detail: `${request.reference} → partner ${partnerId}` })

  return NextResponse.json({ request: updated })
}
