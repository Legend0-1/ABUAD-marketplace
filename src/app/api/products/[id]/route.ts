import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      seller: { select: { id: true, fullName: true, profilePicture: true, matricNumber: true, department: true, level: true } },
      storefront: { select: { id: true, name: true, rating: true, status: true } },
      media: true,
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true, profilePicture: true, department: true } } },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true, profilePicture: true } } },
      },
      _count: { select: { orders: true } },
    },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Increment view count (best effort)
  await db.product.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {})

  // Mark whether current user owns it
  const user = await getCurrentUser()
  const isOwner = !!user && user.id === product.sellerId

  return NextResponse.json({ product, isOwner })
}
