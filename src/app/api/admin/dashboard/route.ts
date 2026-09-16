import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const [
    totalUsers,
    totalStorefronts,
    pendingStorefronts,
    totalProducts,
    totalOrders,
    disputedOrders,
    totalRevenue,
    platformRevenue,
    openReports,
    totalMessages,
    pendingApprovals,
  ] = await Promise.all([
    db.user.count({ where: { isAdmin: false } }),
    db.storefront.count(),
    db.storefront.count({ where: { status: 'pending_approval' } }),
    db.product.count(),
    db.order.count(),
    db.order.count({ where: { status: 'disputed' } }),
    db.order.aggregate({ _sum: { totalAmount: true } }),
    db.order.aggregate({ _sum: { serviceCharge: true } }),
    db.report.count({ where: { status: 'open' } }),
    db.message.count(),
    db.user.count({ where: { isApproved: false, rejectedAt: null } }),
  ])

  // Recent orders
  const recentOrders = await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      product: { select: { title: true } },
      buyer: { select: { fullName: true, matricNumber: true } },
      seller: { select: { fullName: true, matricNumber: true } },
    },
  })

  // Category breakdown
  const categories = await db.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    stats: {
      totalUsers,
      totalStorefronts,
      pendingStorefronts,
      totalProducts,
      totalOrders,
      disputedOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      platformRevenue: platformRevenue._sum.serviceCharge || 0,
      openReports,
      totalMessages,
      pendingApprovals,
    },
    recentOrders,
    categories,
  })
}
