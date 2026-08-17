import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { resolveBankCode, createTransferRecipient, initiateTransfer } from '@/lib/paystack'
import { checkAndCreateReferralCommission } from '@/lib/referral'

// Buyer acknowledges receipt -> triggers a real payout to the seller's bank account
// via Paystack Transfers, out of the platform's escrow balance.
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

    // --- Trigger the real payout to the seller ---
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
        storefront = await db.storefront.update({
          where: { id: storefront.id },
          data: { bankCode, recipientCode },
        })
      }

      const transferRef = `PAYOUT-${order.reference}`
      const transfer = await initiateTransfer({
        amountNaira: order.sellerPayout,
        recipientCode,
        reference: transferRef,
        reason: `Payout for order ${order.reference}`,
      })

      await db.order.update({
        where: { id: orderId },
        data: {
          status: 'completed',
          payoutStatus: transfer.status === 'success' ? 'success' : 'processing',
          transferReference: transferRef,
          payoutAt: new Date(),
        },
      })

      await db.storefront.update({
        where: { id: order.storefrontId },
        data: { totalSales: { increment: order.sellerPayout } },
      })

      await checkAndCreateReferralCommission(order.buyerId)
    } catch (payoutError: any) {
      // Buyer's acknowledgment still stands; flag the payout for admin follow-up
      // rather than silently losing the seller's money.
      console.error('payout error for order', orderId, payoutError)
      await db.order.update({
        where: { id: orderId },
        data: { payoutStatus: 'failed' },
      })
    }

    // Notify seller via conversation
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
          body: `I have acknowledged receipt of order ${order.reference}. The platform will now process your payout of ₦${order.sellerPayout.toLocaleString()} to your bank account. Thank you!`,
        },
      })
    }

    return NextResponse.json({ order: updated, message: 'Receipt acknowledged. Seller payout is now being processed.' })
  } catch (e: any) {
    console.error('acknowledge error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
