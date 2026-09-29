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

  const { grant } = await req.json() // boolean
  const profile = await db.deliveryPartnerProfile.findUnique({ where: { id } })
  if (!profile) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  // Separation of duties: a reviewer can't grant Type-A (buy & deliver) money
  // authority to their own profile.
  if (profile.userId === actor.id) {
    return NextResponse.json({ error: 'You cannot grant Type-A eligibility to your own profile — ask another admin or HR.' }, { status: 403 })
  }
  if (grant && profile.status !== 'approved') {
    return NextResponse.json({ error: 'Partner must be generally approved before granting Type-A (buy & deliver) eligibility' }, { status: 400 })
  }

  const updated = await db.deliveryPartnerProfile.update({
    where: { id },
    data: {
      typeAEligible: !!grant,
      typeAApprovedById: grant ? actor.id : null,
      typeAApprovedAt: grant ? new Date() : null,
    },
    include: { user: { select: { fullName: true } } },
  })

  await logAudit({
    actor,
    action: grant ? 'delivery_partner.type_a_granted' : 'delivery_partner.type_a_revoked',
    targetType: 'DeliveryPartnerProfile',
    targetId: id,
    detail: updated.user.fullName,
  })

  return NextResponse.json({ profile: updated })
}
