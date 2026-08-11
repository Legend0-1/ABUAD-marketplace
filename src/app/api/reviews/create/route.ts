import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, rating, comment } = await req.json()
  if (!productId || !rating || !comment) {
    return NextResponse.json({ error: 'Product, rating and comment required' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
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
