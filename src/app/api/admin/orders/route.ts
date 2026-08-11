import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const orders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      product: { include: { category: true } },
      buyer: { select: { id: true, fullName: true, matricNumber: true, department: true } },
      seller: { select: { id: true, fullName: true, matricNumber: true, department: true } },
      storefront: { select: { id: true, name: true, status: true } },
    },
  })

  return NextResponse.json({ orders })
}

// Admin resolves a disputed order: refund buyer OR release to seller
export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { orderId, action, note } = await req.json()
  // action: "refund" | "release"
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (action === 'refund') {
    const updated = await db.order.update({
      where: { id: orderId },
      data: { status: 'refunded', refundedAt: new Date() },
    })
    // Notify both parties
    await notifyBoth(order, `Order ${order.reference} has been refunded to the buyer. Reason: ${note || 'admin review'}`)
    return NextResponse.json({ order: updated })
  } else if (action === 'release') {
    const updated = await db.order.update({
      where: { id: orderId },
      data: { status: 'completed', acknowledged: true, acknowledgedAt: new Date() },
    })
    await db.storefront.update({
      where: { id: order.storefrontId },
      data: { totalSales: { increment: order.sellerPayout } },
    })
    await notifyBoth(order, `Order ${order.reference} has been resolved. Payout of ₦${order.sellerPayout.toLocaleString()} released to the seller. Note: ${note || 'admin review'}`)
    return NextResponse.json({ order: updated })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

async function notifyBoth(order: any, body: string) {
  const admin = await db.user.findFirst({ where: { isAdmin: true } })
  if (!admin) return
  for (const userId of [order.buyerId, order.sellerId]) {
    let conv = await db.conversation.findFirst({
      where: { type: 'admin_direct', participantAId: admin.id, participantBId: userId },
    })
    if (!conv) {
      conv = await db.conversation.create({
        data: { type: 'admin_direct', participantAId: admin.id, participantBId: userId, subject: 'Order resolution update' },
      })
    }
    await db.message.create({ data: { conversationId: conv.id, senderId: admin.id, body } })
  }
}
