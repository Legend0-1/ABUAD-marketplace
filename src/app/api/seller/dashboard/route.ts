import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { normalizeCurrency } from '@/lib/currency'

export const dynamic = 'force-dynamic'

// Statuses that count as a realized sale ("money in hand"): the buyer has
// acknowledged receipt (which releases payout) or the order is fully complete.
// This matches the dashboard's "only completed orders" revenue basis.
const REALIZED = ['acknowledged', 'completed']
// Buyer has paid but the money is still in escrow — not yet the seller's.
const IN_ESCROW = ['paid', 'in_transit', 'delivered', 'disputed']

/**
 * Seller sales dashboard data. All monetary values are returned as raw NGN
 * numbers (the currency everything is stored in); the client converts and
 * formats them into the seller's chosen display currency via lib/currency.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currency = normalizeCurrency(user.currency)

  const storefront = await db.storefront.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, status: true, rating: true, createdAt: true },
  })

  // Pull every order where this user is the seller. Orders carry their own
  // NGN amounts, so we don't recompute money here — we just aggregate.
  const orders = await db.order.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      reference: true,
      quantity: true,
      totalAmount: true,
      sellerPayout: true,
      serviceCharge: true,
      status: true,
      createdAt: true,
      paidAt: true,
      product: { select: { id: true, title: true } },
      buyer: { select: { fullName: true, matricNumber: true } },
    },
  })

  const realized = orders.filter((o) => REALIZED.includes(o.status))
  const inEscrow = orders.filter((o) => IN_ESCROW.includes(o.status))

  const sum = (arr: typeof orders, pick: (o: (typeof orders)[number]) => number) =>
    arr.reduce((s, o) => s + (pick(o) || 0), 0)

  const grossSales = sum(realized, (o) => o.totalAmount)
  const netEarnings = sum(realized, (o) => o.sellerPayout)
  const unitsSold = sum(realized, (o) => o.quantity)
  const ordersCount = realized.length
  const avgOrderValue = ordersCount ? grossSales / ordersCount : 0
  const pendingPayout = sum(inEscrow, (o) => o.sellerPayout)
  const totalCharges = sum(realized, (o) => o.serviceCharge)

  // Time-series events for the sales chart: one point per realized order, dated
  // by when the money came in (paidAt), falling back to createdAt. The client
  // buckets these by day/week/month for its range selector.
  const salesEvents = realized
    .map((o) => ({
      date: (o.paidAt ?? o.createdAt).toISOString(),
      gross: o.totalAmount,
      net: o.sellerPayout,
      units: o.quantity,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Status breakdown across ALL orders (for the donut).
  const statusMap = new Map<string, { status: string; count: number; amount: number }>()
  for (const o of orders) {
    const cur = statusMap.get(o.status) || { status: o.status, count: 0, amount: 0 }
    cur.count += 1
    cur.amount += o.totalAmount || 0
    statusMap.set(o.status, cur)
  }
  const statusBreakdown = Array.from(statusMap.values()).sort((a, b) => b.count - a.count)

  // Top products by realized gross sales.
  const productMap = new Map<string, { productId: string; title: string; units: number; gross: number; net: number; orders: number }>()
  for (const o of realized) {
    const key = o.product?.id || 'unknown'
    const cur = productMap.get(key) || {
      productId: key,
      title: o.product?.title || 'Removed listing',
      units: 0, gross: 0, net: 0, orders: 0,
    }
    cur.units += o.quantity || 0
    cur.gross += o.totalAmount || 0
    cur.net += o.sellerPayout || 0
    cur.orders += 1
    productMap.set(key, cur)
  }
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.gross - a.gross).slice(0, 8)

  // Full history rows for the filterable table.
  const history = orders.map((o) => ({
    id: o.id,
    reference: o.reference,
    date: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    productTitle: o.product?.title || 'Removed listing',
    buyerName: o.buyer?.fullName || 'Unknown',
    buyerMatric: o.buyer?.matricNumber || '',
    quantity: o.quantity,
    totalAmount: o.totalAmount,
    sellerPayout: o.sellerPayout,
    serviceCharge: o.serviceCharge,
    status: o.status,
  }))

  return NextResponse.json({
    hasStorefront: !!storefront,
    storefront,
    currency,
    kpis: {
      grossSales,
      netEarnings,
      unitsSold,
      ordersCount,
      avgOrderValue,
      pendingPayout,
      totalCharges,
      totalOrdersAllStatuses: orders.length,
    },
    salesEvents,
    statusBreakdown,
    topProducts,
    history,
  })
}
