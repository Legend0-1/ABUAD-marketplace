import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhookSignature, verifyTransaction } from '@/lib/paystack'

// Configure this exact URL in Paystack Dashboard > Settings > API Keys & Webhooks:
//   https://<your-domain>/api/payments/webhook
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

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
      if (order.status === 'pending') {
        await db.order.update({
          where: { id: order.id },
          data: { status: 'paid', paidAt: new Date() },
        })
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
        await db.deliveryRequest.update({
          where: { id: deliveryRequest.id },
          data: { status: 'pending_hr', paidAt: new Date() },
        })
      }
      return NextResponse.json({ received: true })
    }
  }

  return NextResponse.json({ received: true })
}
