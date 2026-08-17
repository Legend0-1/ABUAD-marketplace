import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { initializeTransaction } from '@/lib/paystack'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await db.deliveryRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (request.customerId !== user.id) return NextResponse.json({ error: 'Not your request' }, { status: 403 })
  if (request.status !== 'pending_payment') {
    return NextResponse.json({ error: `This request is already ${request.status}` }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`

  const tx = await initializeTransaction({
    email: user.email,
    amountNaira: request.totalPaid,
    reference: request.reference,
    callbackUrl: `${appUrl}/api/delivery/requests/${request.id}/verify`,
    metadata: { deliveryRequestId: request.id, customerId: user.id },
  })

  await db.deliveryRequest.update({ where: { id: request.id }, data: { paystackReference: tx.reference } })

  return NextResponse.json({ authorizationUrl: tx.authorization_url })
}
