import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { refundTransaction } from '@/lib/paystack'
import { releaseOrderPayout } from '@/lib/payout'
import { restockForRefundedOrder } from '@/lib/inventory'

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

// Admin resolves a disputed order: refund buyer OR release to seller.
// Both branches record the decision as a fact first, then attempt the real
// Paystack money movement -- if that fails, the decision still stands and
// payoutStatus/refund fields are flagged for manual follow-up, rather than
// leaving the order in limbo.
export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { orderId, action, note } = await req.json()
  // action: "refund" | "release"
  const order = await db.order.findUnique({ where: { id: orderId }, include: { storefront: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (action === 'refund') {
    if (!order.paystackReference) {
      return NextResponse.json({ error: 'This order has no payment reference on file — nothing to refund.' }, { status: 400 })
    }

    // Only restock if this order had actually been paid (its stock was
    // decremented at payment time). Skip orders still 'pending' or already
    // 'refunded' so we never restock twice or return units that never left.
    const PAID_STATES = ['paid', 'in_transit', 'delivered', 'acknowledged', 'disputed', 'completed']
    const shouldRestock = PAID_STATES.includes(order.status)

    const updated = await db.order.update({
      where: { id: orderId },
      data: { status: 'refunded', refundedAt: new Date() },
    })
    await logAudit({ actor: admin, action: 'order.refund', targetType: 'Order', targetId: order.id, detail: `${order.reference}: ₦${order.totalAmount.toLocaleString()} — ${note || 'admin review'}` })
    if (shouldRestock) {
      await restockForRefundedOrder(orderId)
    }

    let refundWarning: string | undefined
    try {
      await refundTransaction({ reference: order.paystackReference })
      await logAudit({ actor: admin, action: 'order.refund_processed', targetType: 'Order', targetId: order.id, detail: `Paystack refund initiated for ₦${order.totalAmount.toLocaleString()}` })
    } catch (refundError: any) {
      console.error('paystack refund failed', refundError)
      refundWarning = 'The order was marked refunded, but the actual Paystack refund failed to process automatically. This needs manual follow-up.'
      await logAudit({ actor: admin, action: 'order.refund_failed', targetType: 'Order', targetId: order.id, detail: String(refundError?.message || refundError) })
    }

    await notifyBoth(order, `Order ${order.reference} has been refunded to the buyer. Reason: ${note || 'admin review'}`)
    return NextResponse.json({ order: updated, warning: refundWarning })
  } else if (action === 'release') {
    // Admin sides with the seller: resolve the dispute and pay out. Record the
    // decision as a fact first, then let the shared payout engine move the money
    // -- it handles OTP / processing / failure and credits the sale exactly once,
    // so a stuck transfer can be retried from the Payouts tab instead of being lost.
    const updated = await db.order.update({
      where: { id: orderId },
      data: { status: 'completed', acknowledged: true, acknowledgedAt: order.acknowledgedAt ?? new Date() },
    })
    await logAudit({ actor: admin, action: 'order.release', targetType: 'Order', targetId: order.id, detail: `${order.reference}: ₦${order.sellerPayout.toLocaleString()} released — ${note || 'admin review'}` })

    const payout = await releaseOrderPayout(orderId)
    await logAudit({
      actor: admin,
      action: payout.ok ? 'order.release_processed' : 'order.release_failed',
      targetType: 'Order',
      targetId: order.id,
      detail: payout.message,
    })

    const statusWord = payout.payoutStatus === 'success' ? 'complete' : 'being processed'
    await notifyBoth(order, `Order ${order.reference} has been resolved. Payout of ₦${order.sellerPayout.toLocaleString()} to the seller is ${statusWord}. Note: ${note || 'admin review'}`)

    const warning = payout.ok
      ? undefined
      : payout.needsOtp
        ? 'The order is resolved, but the payout needs the Paystack OTP to release — finish it from the Payouts tab.'
        : `The order is resolved, but the Paystack payout did not go through (${payout.message}). Retry it from the Payouts tab.`
    return NextResponse.json({ order: updated, warning })
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
