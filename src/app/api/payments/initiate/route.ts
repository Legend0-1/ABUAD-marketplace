import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { initializeTransaction } from '@/lib/paystack'

// Starts payment collection for an order that's already been created (status "pending").
// The buyer is redirected to Paystack's hosted page to pay by card/bank transfer/USSD.
// Funds settle into the platform's own Paystack balance — the seller's bank details
// are never shown to the buyer at this stage.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = await req.json()
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyerId !== user.id) return NextResponse.json({ error: 'Not your order' }, { status: 403 })
    if (order.status !== 'pending') {
      return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`

    const tx = await initializeTransaction({
      email: user.email,
      amountNaira: order.totalAmount,
      reference: order.reference, // reuse the human-friendly order reference
      callbackUrl: `${appUrl}/api/payments/verify?orderId=${order.id}`,
      metadata: { orderId: order.id, buyerId: user.id },
    })

    await db.order.update({
      where: { id: order.id },
      data: { paystackReference: tx.reference },
    })

    return NextResponse.json({ authorizationUrl: tx.authorization_url })
  } catch (e: any) {
    console.error('payment initiate error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
