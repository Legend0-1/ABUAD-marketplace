import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { releaseOrderPayout } from '@/lib/payout'

// Buyer acknowledges receipt -> triggers a real payout to the seller's bank account
// via Paystack Transfers, out of the platform's escrow balance. The actual money
// movement is delegated to releaseOrderPayout(), which handles every Paystack
// transfer state (success / processing / OTP-required / failed) and is safe to
// retry from the admin Payouts screen if it doesn't settle immediately.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId, note } = await req.json()
    const order = await db.order.findUnique({ where: { id: orderId }, include: { storefront: true } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyerId !== user.id) return NextResponse.json({ error: 'Only the buyer can acknowledge receipt' }, { status: 403 })
    if (order.acknowledged) return NextResponse.json({ error: 'You have already acknowledged this order' }, { status: 400 })
    if (order.status !== 'paid' && order.status !== 'delivered') {
      return NextResponse.json({ error: 'This order has not been paid for yet' }, { status: 400 })
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        status: 'acknowledged',
      },
    })

    await db.acknowledgment.create({
      data: {
        orderId,
        userId: user.id,
        type: 'received',
        note: note || 'Item received in good condition.',
      },
    })

    // --- Trigger the real payout to the seller (idempotent, OTP-aware) ---
    // Never let a payout hiccup undo the buyer's acknowledgment: the engine
    // flags the order for admin follow-up instead of throwing.
    const payout = await releaseOrderPayout(orderId).catch((e) => {
      console.error('payout error for order', orderId, e)
      return { ok: false, payoutStatus: 'failed', message: 'Payout could not be started.' } as const
    })

    // Notify seller via conversation. Keep the tone reassuring regardless of the
    // payout's internal state — admins resolve any stuck transfer behind the scenes.
    const payoutLine = payout.payoutStatus === 'success'
      ? `Your payout of ₦${order.sellerPayout.toLocaleString()} has been sent to your bank account.`
      : `The platform is processing your payout of ₦${order.sellerPayout.toLocaleString()} to your bank account.`
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
          body: `I have acknowledged receipt of order ${order.reference}. ${payoutLine} Thank you!`,
        },
      })
    }

    return NextResponse.json({ order: updated, message: 'Receipt acknowledged. Seller payout is now being processed.' })
  } catch (e: any) {
    console.error('acknowledge error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
