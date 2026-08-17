import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Buyer disputes an order — holds funds, triggers admin review
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId, reason } = await req.json()
    if (!reason) return NextResponse.json({ error: 'Please describe the issue' }, { status: 400 })

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyerId !== user.id) return NextResponse.json({ error: 'Only the buyer can dispute' }, { status: 403 })
    if (order.acknowledged) return NextResponse.json({ error: 'You already acknowledged this order' }, { status: 400 })

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        status: 'disputed',
        refundRequested: true,
        refundReason: reason,
      },
    })

    await db.acknowledgment.create({
      data: {
        orderId,
        userId: user.id,
        type: 'disputed',
        note: reason,
      },
    })

    // Notify seller
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
          body: `I am disputing order ${order.reference}. Reason: ${reason}. The admin has been notified and will review this case.`,
        },
      })
    }

    return NextResponse.json({ order: updated, message: 'Dispute submitted. The admin will review your case and contact you.' })
  } catch (e: any) {
    console.error('dispute error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
