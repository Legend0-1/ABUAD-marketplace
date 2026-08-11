import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ storefront: null })
  const storefront = await db.storefront.findUnique({
    where: { ownerId: user.id },
    include: {
      products: {
        orderBy: { createdAt: 'desc' },
        include: { category: true, media: true },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { product: true, buyer: { select: { id: true, fullName: true, profilePicture: true, matricNumber: true } } },
      },
    },
  })
  return NextResponse.json({ storefront })
}
