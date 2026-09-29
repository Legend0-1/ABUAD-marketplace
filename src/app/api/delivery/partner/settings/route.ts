import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * PATCH /api/delivery/partner/settings
 * Lets an approved delivery partner update their own delivery fee and toggle
 * their availability (whether they appear in the customer's pick-a-partner list
 * and can receive new requests). Only these two fields are editable here.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await db.deliveryPartnerProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: 'You are not a delivery partner' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: { deliveryFee?: number; isAvailable?: boolean } = {}

  if (body.deliveryFee !== undefined) {
    const fee = Number(body.deliveryFee)
    if (!Number.isFinite(fee) || fee <= 0) {
      return NextResponse.json({ error: 'Delivery fee must be a positive amount' }, { status: 400 })
    }
    if (fee > 1_000_000) {
      return NextResponse.json({ error: 'That delivery fee looks too high' }, { status: 400 })
    }
    data.deliveryFee = fee
  }

  if (body.isAvailable !== undefined) {
    data.isAvailable = !!body.isAvailable
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await db.deliveryPartnerProfile.update({
    where: { id: profile.id },
    data,
  })

  return NextResponse.json({ profile: updated })
}
