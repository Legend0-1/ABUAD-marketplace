import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { normalizeCampus } from '@/lib/campus'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      seller: { select: { id: true, fullName: true, profilePicture: true, department: true, level: true } },
      storefront: { select: { id: true, name: true, rating: true, status: true, campusKeys: true } },
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

  // Campus scoping: a non-admin viewer can only open listings whose storefront
  // includes their campus. Owners always see their own listing. Unauthorized
  // access returns 404 (not 403) so a listing's existence isn't leaked.
  const user = await getCurrentUser()
  const isOwner = !!user && user.id === product.sellerId
  const isAdmin = !!user?.isAdmin
  if (!isOwner && !isAdmin) {
    const viewerKey = normalizeCampus(user?.institution)
    const keys = product.storefront?.campusKeys ?? []
    if (!viewerKey || !keys.includes(viewerKey)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  // Increment view count (best effort) — only after the access check passes.
  await db.product.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {})

  return NextResponse.json({ product, isOwner })
}
