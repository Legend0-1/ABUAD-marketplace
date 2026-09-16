import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'

// Known demo seller accounts (post email-migration addresses). Hard-coded on
// purpose -- this is specifically for the known seed accounts, not a general
// "delete anything that looks like a demo" tool.
const DEMO_SELLER_EMAILS = [
  'chioma.okafor@student.unimart.ng',
  'tunde.bello@student.unimart.ng',
  'amina.yusuf@student.unimart.ng',
  'david.adebayo@student.unimart.ng',
]

export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { action } = await req.json() // "hide" | "show"

  const demoOwners = await db.user.findMany({
    where: { email: { in: DEMO_SELLER_EMAILS } },
    select: { id: true },
  })
  const ownerIds = demoOwners.map((u) => u.id)

  if (ownerIds.length === 0) {
    return NextResponse.json({ storefronts: 0, products: 0, note: 'No known demo seller accounts found in this database.' })
  }

  const storefronts = await db.storefront.findMany({ where: { ownerId: { in: ownerIds } }, select: { id: true } })
  const storefrontIds = storefronts.map((s) => s.id)

  if (action === 'hide') {
    const [sfResult, prodResult] = await Promise.all([
      db.storefront.updateMany({ where: { id: { in: storefrontIds } }, data: { status: 'hidden' } }),
      db.product.updateMany({ where: { storefrontId: { in: storefrontIds } }, data: { status: 'paused' } }),
    ])
    await logAudit({ actor: admin, action: 'admin.hide_demo_data', detail: `${sfResult.count} storefronts, ${prodResult.count} products` })
    return NextResponse.json({ storefronts: sfResult.count, products: prodResult.count })
  } else if (action === 'show') {
    const [sfResult, prodResult] = await Promise.all([
      db.storefront.updateMany({ where: { id: { in: storefrontIds }, status: 'hidden' }, data: { status: 'active' } }),
      db.product.updateMany({ where: { storefrontId: { in: storefrontIds }, status: 'paused' }, data: { status: 'active' } }),
    ])
    await logAudit({ actor: admin, action: 'admin.show_demo_data', detail: `${sfResult.count} storefronts, ${prodResult.count} products` })
    return NextResponse.json({ storefronts: sfResult.count, products: prodResult.count })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
