import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { normalizeCampus } from '@/lib/campus'

// Combined search: products, sellers (storefronts), categories.
// Campus scoping matches the product list: logged-out → needsAuth; no campus →
// needsCampus; otherwise only same-campus rows (admins bypass).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ products: [], storefronts: [], categories: [] })

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ products: [], storefronts: [], categories: [], needsAuth: true })
  }
  const isAdmin = !!user.isAdmin
  const viewerKey = normalizeCampus(user.institution)
  if (!isAdmin && !viewerKey) {
    return NextResponse.json({ products: [], storefronts: [], categories: [], needsCampus: true })
  }

  const products = await db.product.findMany({
    where: {
      status: 'active',
      ...(isAdmin ? {} : { storefront: { campusKeys: { has: viewerKey } } }),
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
      ...(isAdmin ? {} : { campusKeys: { has: viewerKey } }),
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
      ],
    },
    take: 10,
    select: {
      id: true, ownerId: true, name: true, description: true, type: true, rating: true, totalSales: true,
      owner: { select: { id: true, fullName: true, profilePicture: true } },
    },
  })

  const categories = await db.category.findMany({
    where: { name: { contains: q } },
    take: 10,
  })

  return NextResponse.json({ products, storefronts, categories })
}
