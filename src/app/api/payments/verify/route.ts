import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyTransaction } from '@/lib/paystack'
import { decrementStockForPaidOrder } from '@/lib/inventory'

// Paystack redirects the buyer's browser here after checkout. We double check the
// transaction and (as a fallback, in case the webhook hasn't landed yet) mark the
// order paid, then send the buyer back to their order page.
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`

  if (!orderId) return NextResponse.redirect(`${appUrl}/`)

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order || !order.paystackReference) {
    return NextResponse.redirect(`${appUrl}/?view=orders&payment=error`)
  }

  try {
    const verified = await verifyTransaction(order.paystackReference)
    if (verified.status === 'success') {
      // Same atomic guard as the webhook: only the caller that actually flips
      // pending -> paid decrements stock, so we never double-count a sale.
      const flip = await db.order.updateMany({
        where: { id: order.id, status: 'pending' },
        data: { status: 'paid', paidAt: new Date() },
      })
      if (flip.count === 1) {
        await decrementStockForPaidOrder(order.id)
      }
    }
  } catch (e) {
    console.error('verify callback error', e)
  }

  return NextResponse.redirect(`${appUrl}/?view=orders&payment=complete&orderId=${orderId}`)
}
