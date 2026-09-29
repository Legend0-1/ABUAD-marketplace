import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { getDeliveryFlatFee, setSetting, SETTING_KEYS } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/**
 * Platform settings the admin can adjust (item 5). Currently exposes the flat
 * platform delivery fee that is added on top of each partner's own fee.
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const deliveryFlatFee = await getDeliveryFlatFee()
  return NextResponse.json({ deliveryFlatFee })
}

export async function PUT(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { deliveryFlatFee } = await req.json()
  const fee = Number(deliveryFlatFee)
  if (!Number.isFinite(fee) || fee < 0 || fee > 1_000_000) {
    return NextResponse.json({ error: 'Enter a valid fee between ₦0 and ₦1,000,000' }, { status: 400 })
  }

  // Store as an integer-naira string (no kobo for a flat fee).
  const value = String(Math.round(fee))
  await setSetting(SETTING_KEYS.DELIVERY_FLAT_FEE, value, admin.id)
  await logAudit({
    actor: admin,
    action: 'settings.update',
    targetType: 'Setting',
    targetId: SETTING_KEYS.DELIVERY_FLAT_FEE,
    detail: `Delivery flat fee set to ₦${Number(value).toLocaleString()}`,
  })

  return NextResponse.json({ deliveryFlatFee: Number(value) })
}
