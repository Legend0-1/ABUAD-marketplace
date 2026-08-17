import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, description, dropoffLocation, itemCost, serviceFee } = await req.json()

  if (!['buy_and_deliver', 'errand_only'].includes(type)) {
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  }
  if (!description?.trim() || !dropoffLocation?.trim()) {
    return NextResponse.json({ error: 'Description and drop-off location are required' }, { status: 400 })
  }
  const fee = Number(serviceFee)
  if (!fee || fee <= 0) {
    return NextResponse.json({ error: 'Service fee must be a positive amount' }, { status: 400 })
  }
  let cost: number | null = null
  if (type === 'buy_and_deliver') {
    cost = Number(itemCost)
    if (!cost || cost <= 0) {
      return NextResponse.json({ error: 'Item cost is required for buy & deliver requests' }, { status: 400 })
    }
  }

  const totalPaid = (cost || 0) + fee
  const reference = 'DLV-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()

  const request = await db.deliveryRequest.create({
    data: {
      reference,
      customerId: user.id,
      type,
      description: description.trim(),
      dropoffLocation: dropoffLocation.trim(),
      itemCost: cost,
      serviceFee: fee,
      totalPaid,
      status: 'pending_payment',
    },
  })

  return NextResponse.json({ request })
}
