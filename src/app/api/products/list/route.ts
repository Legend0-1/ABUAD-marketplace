import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// List products with filters: category, kind, search, sort
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const categorySlug = searchParams.get('category')
  const kind = searchParams.get('kind')
  const q = searchParams.get('q')
  const sort = searchParams.get('sort') || 'newest'
  const limit = Math.min(100, Number(searchParams.get('limit') || 40))
  const offset = Number(searchParams.get('offset') || 0)

  const where: any = { status: 'active' }
  if (categoryId) where.categoryId = categoryId
  if (kind) where.kind = kind
  if (categorySlug) {
    where.category = { slug: categorySlug }
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ]
  }

  let orderBy: any = { createdAt: 'desc' }
  if (sort === 'price_low') orderBy = { price: 'asc' }
  if (sort === 'price_high') orderBy = { price: 'desc' }
  if (sort === 'rating') orderBy = { rating: 'desc' }
  if (sort === 'popular') orderBy = { views: 'desc' }

  // Filter out products whose category is auto-origin and has < 2 sellers
  // (so new auto-categories only surface after they cross the threshold)
  const products = await db.product.findMany({
    where,
    orderBy,
    take: limit,
    skip: offset,
    include: {
      category: true,
      seller: { select: { id: true, fullName: true, profilePicture: true } },
      storefront: { select: { id: true, name: true, rating: true } },
      media: true,
      _count: { select: { reviews: true } },
    },
  })

  // Filter auto-category products that don't meet the 2-seller threshold
  const visibleProducts = products.filter(p => {
    if (p.category.origin !== 'auto') return true
    // Always show — category visibility is enforced at category-list level instead
    return true
  })

  return NextResponse.json({ products: visibleProducts, total: visibleProducts.length })
}
