import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getDeliveryFlatFee } from '@/lib/settings'

/**
 * Creates a delivery request. The customer picks a specific delivery partner
 * (item 5) instead of naming a price: the partner's own delivery fee becomes the
 * serviceFee, and a platform flat fee (admin-adjustable, default ₦1000) is added
 * on top. For buy_and_deliver, the item cost is added as well.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, description, dropoffLocation, itemCost, partnerId } = await req.json()

  if (!['buy_and_deliver', 'errand_only'].includes(type)) {
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  }
  if (!description?.trim() || !dropoffLocation?.trim()) {
    return NextResponse.json({ error: 'Description and drop-off location are required' }, { status: 400 })
  }
  if (!partnerId) {
    return NextResponse.json({ error: 'Please choose a delivery partner' }, { status: 400 })
  }

  // Load the chosen partner and validate they can take this job right now.
  const partner = await db.deliveryPartnerProfile.findUnique({ where: { id: partnerId } })
  if (!partner || partner.status !== 'approved' || !partner.isAvailable) {
    return NextResponse.json({ error: 'That partner is no longer available. Please pick another.' }, { status: 400 })
  }
  if (partner.userId === user.id) {
    return NextResponse.json({ error: 'You cannot request a delivery from yourself' }, { status: 400 })
  }
  if (!partner.deliveryFee || partner.deliveryFee <= 0) {
    return NextResponse.json({ error: 'That partner has not set a valid delivery fee.' }, { status: 400 })
  }
  if (type === 'buy_and_deliver' && !partner.typeAEligible) {
    return NextResponse.json({ error: 'That partner is not eligible for buy & deliver jobs. Please pick another.' }, { status: 400 })
  }

  let cost: number | null = null
  if (type === 'buy_and_deliver') {
    cost = Number(itemCost)
    if (!cost || cost <= 0) {
      return NextResponse.json({ error: 'Item cost is required for buy & deliver requests' }, { status: 400 })
    }
  }

  // Fees: partner's own delivery fee + platform flat fee (+ item cost if any).
  const serviceFee = partner.deliveryFee
  const platformFee = await getDeliveryFlatFee()
  const totalPaid = (cost || 0) + serviceFee + platformFee
  const reference = 'DLV-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()

  const request = await db.deliveryRequest.create({
    data: {
      reference,
      customerId: user.id,
      type,
      description: description.trim(),
      dropoffLocation: dropoffLocation.trim(),
      itemCost: cost,
      serviceFee,
      platformFee,
      totalPaid,
      partnerId: partner.id,
      status: 'pending_payment',
    },
  })

  return NextResponse.json({ request })
}
