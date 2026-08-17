import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ orders: { asBuyer: [], asSeller: [] } })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') // 'buyer' | 'seller'

  const buyerOrders = await db.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      product: { include: { media: true, category: true } },
      seller: { select: { id: true, fullName: true, profilePicture: true } },
    },
  })

  const sellerOrders = await db.order.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      product: { include: { media: true, category: true } },
      buyer: { select: { id: true, fullName: true, profilePicture: true } },
    },
  })

  if (role === 'buyer') return NextResponse.json({ orders: { asBuyer: buyerOrders, asSeller: [] } })
  if (role === 'seller') return NextResponse.json({ orders: { asBuyer: [], asSeller: sellerOrders } })

  return NextResponse.json({ orders: { asBuyer: buyerOrders, asSeller: sellerOrders } })
}
