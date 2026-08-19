import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { sendNewOrderEmail } from '@/lib/email'
import { sendNewOrderSms } from '@/lib/sms'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { productId, quantity = 1, deliveryAddress, deliveryNotes } = await req.json()

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { storefront: true, seller: { select: { fullName: true, email: true, phone: true } } },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (product.status !== 'active') return NextResponse.json({ error: 'This listing is not available' }, { status: 400 })
    if (product.sellerId === user.id) return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 })

    if (product.kind === 'product' && product.stock < quantity) {
      return NextResponse.json({ error: 'Not enough stock' }, { status: 400 })
    }

    const agreement = await db.agreement.findFirst({ where: { isActive: true } })
    const chargePct = agreement?.serviceChargePercent ?? 20

    const unitPrice = product.price
    const totalAmount = unitPrice * quantity
    const serviceCharge = (totalAmount * chargePct) / 100
    const sellerPayout = totalAmount - serviceCharge

    const reference = 'ABU-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()

    const order = await db.order.create({
      data: {
        reference,
        productId,
        storefrontId: product.storefrontId,
        buyerId: user.id,
        sellerId: product.sellerId,
        quantity,
        unitPrice,
        totalAmount,
        serviceCharge,
        sellerPayout,
        status: 'pending',
        deliveryAddress: deliveryAddress || null,
        deliveryNotes: deliveryNotes || null,
      },
    })

    // Create or reuse a conversation between buyer & seller so they can chat
    let conv = await db.conversation.findFirst({
      where: {
        OR: [
          { participantAId: user.id, participantBId: product.sellerId, type: 'direct' },
          { participantAId: product.sellerId, participantBId: user.id, type: 'direct' },
        ],
      },
    })
    if (!conv) {
      conv = await db.conversation.create({
        data: {
          type: 'direct',
          participantAId: user.id,
          participantBId: product.sellerId,
          subject: `Order ${reference} — ${product.title}`,
        },
      })
    }
    // Send a system-style opening message from buyer
    await db.message.create({
      data: {
        conversationId: conv.id,
        senderId: user.id,
        body: `Hi! I just placed order ${reference} for "${product.title}" (₦${totalAmount.toLocaleString()}). ${deliveryNotes ? 'Notes: ' + deliveryNotes : ''} Please confirm availability and let me know the delivery details. Thanks!`,
      },
    })

    // Notify the seller by email -- awaited so it actually completes before
    // this serverless function's execution ends, but failures never block
    // order creation itself (the order above is already committed).
    await sendNewOrderEmail({
      sellerEmail: product.seller.email,
      sellerName: product.seller.fullName,
      buyerName: user.fullName,
      productTitle: product.title,
      quantity,
      totalAmount,
      reference,
    }).catch((e) => console.error('new order email failed', e))

    if (product.seller.phone) {
      await sendNewOrderSms({
        sellerPhone: product.seller.phone,
        buyerName: user.fullName,
        productTitle: product.title,
        totalAmount,
      }).catch((e) => console.error('new order sms failed', e))
    }

    return NextResponse.json({ order, conversationId: conv.id })
  } catch (e: any) {
    console.error('order create error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
