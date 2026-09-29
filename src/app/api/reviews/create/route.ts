import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(req, 'review')
  if (!rl.allowed) return NextResponse.json({ error: 'Too many reviews in a short time. Please wait a moment.' }, { status: 429 })

  const { productId, rating, comment } = await req.json()
  if (!productId || !rating || !comment) {
    return NextResponse.json({ error: 'Product, rating and comment required' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }

  // The product must exist, and you can't review your own listing.
  const product = await db.product.findUnique({ where: { id: productId }, select: { sellerId: true } })
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  if (product.sellerId === user.id) {
    return NextResponse.json({ error: 'You cannot review your own listing' }, { status: 400 })
  }

  // Require a real purchase: only a buyer with an order for this product that
  // actually reached payment may review it. Blocks drive-by rating manipulation
  // (fake 5-stars on your own items, 1-star on competitors) with no transaction.
  const purchased = await db.order.findFirst({
    where: {
      productId,
      buyerId: user.id,
      status: { in: ['paid', 'in_transit', 'delivered', 'acknowledged', 'disputed', 'completed'] },
    },
    select: { id: true },
  })
  if (!purchased) {
    return NextResponse.json({ error: 'You can only review items you have purchased.' }, { status: 403 })
  }

  // Prevent duplicate reviews by same user on same product
  const existing = await db.review.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 })
  }

  const review = await db.review.create({
    data: { productId, userId: user.id, rating, comment },
  })

  // Update product aggregate rating
  const all = await db.review.findMany({ where: { productId }, select: { rating: true } })
  const avg = all.reduce((s, r) => s + r.rating, 0) / (all.length || 1)
  await db.product.update({
    where: { id: productId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: all.length },
  })

  return NextResponse.json({ review })
}
