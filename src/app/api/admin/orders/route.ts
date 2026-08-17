import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { checkAndCreateReferralCommission } from '@/lib/referral'
import { refundTransaction, resolveBankCode, createTransferRecipient, initiateTransfer } from '@/lib/paystack'

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

    const updated = await db.order.update({
      where: { id: orderId },
      data: { status: 'refunded', refundedAt: new Date() },
    })
    await logAudit({ actor: admin, action: 'order.refund', targetType: 'Order', targetId: order.id, detail: `${order.reference}: ₦${order.totalAmount.toLocaleString()} — ${note || 'admin review'}` })

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
    const updated = await db.order.update({
      where: { id: orderId },
      data: { status: 'completed', acknowledged: true, acknowledgedAt: new Date() },
    })
    await db.storefront.update({
      where: { id: order.storefrontId },
      data: { totalSales: { increment: order.sellerPayout } },
    })
    await logAudit({ actor: admin, action: 'order.release', targetType: 'Order', targetId: order.id, detail: `${order.reference}: ₦${order.sellerPayout.toLocaleString()} released — ${note || 'admin review'}` })

    let payoutWarning: string | undefined
    try {
      let storefront = order.storefront
      let recipientCode = storefront.recipientCode
      if (!recipientCode) {
        let bankCode = storefront.bankCode
        if (!bankCode) {
          bankCode = await resolveBankCode(storefront.bankName)
          if (!bankCode) throw new Error(`Could not resolve bank code for "${storefront.bankName}"`)
        }
        const recipient = await createTransferRecipient({
          accountName: storefront.accountName,
          accountNumber: storefront.accountNumber,
          bankCode,
        })
        recipientCode = recipient.recipient_code
        storefront = await db.storefront.update({ where: { id: storefront.id }, data: { bankCode, recipientCode } })
      }

      const transferRef = `RELEASE-${order.reference}`
      const transfer = await initiateTransfer({
        amountNaira: order.sellerPayout,
        recipientCode,
        reference: transferRef,
        reason: `Admin-resolved payout for order ${order.reference}`,
      })
      await db.order.update({
        where: { id: orderId },
        data: { payoutStatus: transfer.status === 'success' ? 'success' : 'processing', transferReference: transferRef, payoutAt: new Date() },
      })
      await logAudit({ actor: admin, action: 'order.release_processed', targetType: 'Order', targetId: order.id, detail: `Paystack transfer initiated for ₦${order.sellerPayout.toLocaleString()}` })
    } catch (transferError: any) {
      console.error('admin release payout failed', transferError)
      payoutWarning = 'The order was marked completed, but the actual Paystack payout to the seller failed to process automatically. This needs manual follow-up.'
      await db.order.update({ where: { id: orderId }, data: { payoutStatus: 'failed' } })
      await logAudit({ actor: admin, action: 'order.release_failed', targetType: 'Order', targetId: order.id, detail: String(transferError?.message || transferError) })
    }

    await notifyBoth(order, `Order ${order.reference} has been resolved. Payout of ₦${order.sellerPayout.toLocaleString()} released to the seller. Note: ${note || 'admin review'}`)
    await checkAndCreateReferralCommission(order.buyerId)
    return NextResponse.json({ order: updated, warning: payoutWarning })
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
