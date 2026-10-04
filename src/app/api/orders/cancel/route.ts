import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Buyer cancels an order that is still unpaid ("pending").
//
// Why pending-only: once money has entered escrow (status "paid" and beyond)
// a refund has to be reconciled, so those orders must go through the existing
// dispute/refund flow instead of a free cancel. A pending order never collected
// anything, so cancelling it is safe and simply stops it sitting on the seller's
// dashboard forever.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId, reason } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyerId !== user.id) {
      return NextResponse.json({ error: 'Only the buyer can cancel this order' }, { status: 403 })
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'This order has already been cancelled' }, { status: 400 })
    }
    if (order.status !== 'pending') {
      // Already paid (or further along) — a cancel would need a refund.
      return NextResponse.json({
        error: 'This order has already been paid for and cannot be cancelled here. Use "Dispute" to request a refund.',
      }, { status: 400 })
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : ''

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: trimmedReason || null,
      },
    })

    // Let the seller know in the order conversation so the cancellation is
    // visible on their side (not just as a status flip).
    const conv = await db.conversation.findFirst({
      where: {
        OR: [
          { participantAId: user.id, participantBId: order.sellerId },
          { participantAId: order.sellerId, participantBId: user.id },
        ],
      },
    })
    if (conv) {
      await db.message.create({
        data: {
          conversationId: conv.id,
          senderId: user.id,
          body: `I've cancelled order ${order.reference} before payment.${trimmedReason ? ` Reason: ${trimmedReason}` : ''}`,
        },
      }).catch((e) => console.error('cancel notice message failed', e))
    }

    return NextResponse.json({ order: updated, message: 'Order cancelled.' })
  } catch (e: any) {
    console.error('order cancel error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
