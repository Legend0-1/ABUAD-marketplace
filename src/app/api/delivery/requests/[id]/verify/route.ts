import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyTransaction } from '@/lib/paystack'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`

  const request = await db.deliveryRequest.findUnique({ where: { id } })
  if (!request || !request.paystackReference) {
    return NextResponse.redirect(`${appUrl}/?view=deliveries&payment=error`)
  }

  try {
    const verified = await verifyTransaction(request.paystackReference)
    if (verified.status === 'success' && request.status === 'pending_payment') {
      await db.deliveryRequest.update({
        where: { id: request.id },
        data: { status: 'pending_hr', paidAt: new Date() },
      })
    }
  } catch (e) {
    console.error('delivery verify callback error', e)
  }

  return NextResponse.redirect(`${appUrl}/?view=deliveries&payment=complete&requestId=${id}`)
}
