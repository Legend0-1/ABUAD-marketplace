import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, fullName: true, matricNumber: true, level: true, department: true, profilePicture: true, isAdmin: true, isBanned: true, createdAt: true,
      _count: { select: { products: true, ordersAsBuyer: true, ordersAsSeller: true, reportsAgainst: true } },
    },
  })

  return NextResponse.json({ users })
}

// Ban / unban user
export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { userId, action } = await req.json()
  // action: "ban" | "unban"
  if (action === 'ban') {
    await db.user.update({ where: { id: userId }, data: { isBanned: true } })
    // Suspend storefront too
    await db.storefront.updateMany({ where: { ownerId: userId }, data: { status: 'suspended' } })
  } else if (action === 'unban') {
    await db.user.update({ where: { id: userId }, data: { isBanned: false } })
    await db.storefront.updateMany({ where: { ownerId: userId }, data: { status: 'active' } })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
