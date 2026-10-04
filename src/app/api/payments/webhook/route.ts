import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhookSignature, verifyTransaction } from '@/lib/paystack'
import { decrementStockForPaidOrder } from '@/lib/inventory'
import { reconcilePayoutByReference } from '@/lib/payout'

// Configure this exact URL in Paystack Dashboard > Settings > API Keys & Webhooks:
//   https://<your-domain>/api/payments/webhook
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  // --- Seller payouts (platform -> seller bank account) -----------------------
  // Transfers settle asynchronously, so Paystack tells us the final outcome here.
  // We never trust the webhook body: reconcilePayoutByReference re-verifies the
  // transfer with Paystack before flipping the order's payout state.
  if (event.event === 'transfer.success' || event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
    const reference = event.data?.reference as string | undefined
    if (reference) {
      await reconcilePayoutByReference(reference).catch((e) => console.error('payout reconcile failed', reference, e))
    }
    return NextResponse.json({ received: true })
  }

  if (event.event === 'charge.success') {
    const reference = event.data.reference as string

    // Never trust the webhook body's amount/status alone — re-verify with Paystack.
    const verified = await verifyTransaction(reference)
    if (verified.status !== 'success') {
      return NextResponse.json({ received: true })
    }

    const order = await db.order.findUnique({ where: { paystackReference: reference } })
    if (order) {
      // amount is in kobo; guard against tampering by checking it matches the order total
      const paidNaira = verified.amount / 100
      if (Math.abs(paidNaira - order.totalAmount) > 1) {
        console.error(`Amount mismatch for order ${order.id}: paid ${paidNaira}, expected ${order.totalAmount}`)
        return NextResponse.json({ received: true })
      }
      // Atomically flip pending -> paid. The status guard in updateMany means
      // only ONE of {this webhook, the browser verify callback} actually
      // performs the transition, so stock is decremented exactly once.
      const flip = await db.order.updateMany({
        where: { id: order.id, status: 'pending' },
        data: { status: 'paid', paidAt: new Date() },
      })
      if (flip.count === 1) {
        await decrementStockForPaidOrder(order.id)
      }
      return NextResponse.json({ received: true })
    }

    const deliveryRequest = await db.deliveryRequest.findUnique({ where: { paystackReference: reference } })
    if (deliveryRequest) {
      const paidNaira = verified.amount / 100
      if (Math.abs(paidNaira - deliveryRequest.totalPaid) > 1) {
        console.error(`Amount mismatch for delivery request ${deliveryRequest.id}: paid ${paidNaira}, expected ${deliveryRequest.totalPaid}`)
        return NextResponse.json({ received: true })
      }
      if (deliveryRequest.status === 'pending_payment') {
        // Customer already chose a partner at creation, so go straight to that
        // partner to accept/decline. Legacy requests with no partner fall back
        // to the HR assignment queue.
        const nextStatus = deliveryRequest.partnerId ? 'awaiting_partner' : 'pending_hr'
        await db.deliveryRequest.update({
          where: { id: deliveryRequest.id },
          data: { status: nextStatus, paidAt: new Date() },
        })
      }
      return NextResponse.json({ received: true })
    }
  }

  return NextResponse.json({ received: true })
}
