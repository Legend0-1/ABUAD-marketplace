import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Combined search: products, sellers (storefronts), categories
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ products: [], storefronts: [], categories: [] })

  const products = await db.product.findMany({
    where: {
      status: 'active',
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: 20,
    include: {
      category: true,
      seller: { select: { id: true, fullName: true, profilePicture: true } },
      storefront: { select: { id: true, name: true, rating: true } },
      media: true,
      _count: { select: { reviews: true } },
    },
    orderBy: { views: 'desc' },
  })

  const storefronts = await db.storefront.findMany({
    where: {
      status: 'active',
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: 10,
    include: { owner: { select: { id: true, fullName: true, profilePicture: true } } },
  })

  const categories = await db.category.findMany({
    where: { name: { contains: q } },
    take: 10,
  })

  return NextResponse.json({ products, storefronts, categories })
}
