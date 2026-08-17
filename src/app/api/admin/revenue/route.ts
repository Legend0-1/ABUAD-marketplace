import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const daysParam = Number(req.nextUrl.searchParams.get('days') || 30)
  const since = new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000)

  const orders = await db.order.findMany({
    where: {
      status: 'completed',
      payoutAt: { gte: since },
    },
    select: {
      payoutAt: true,
      sellerPayout: true,
      serviceCharge: true,
      totalAmount: true,
      sellerId: true,
      seller: { select: { fullName: true } },
    },
    orderBy: { payoutAt: 'desc' },
  })

  // Aggregate: per day -> per seller -> totals, plus a running platform total.
  type DaySellerKey = string // `${date}|${sellerId}`
  const byDaySeller = new Map<DaySellerKey, { date: string; sellerId: string; sellerName: string; payout: number; serviceCharge: number; orders: number }>()
  let platformServiceChargeTotal = 0
  let platformPayoutTotal = 0

  for (const o of orders) {
    if (!o.payoutAt) continue
    const date = o.payoutAt.toISOString().slice(0, 10) // YYYY-MM-DD
    const key = `${date}|${o.sellerId}`
    const existing = byDaySeller.get(key)
    if (existing) {
      existing.payout += o.sellerPayout
      existing.serviceCharge += o.serviceCharge
      existing.orders += 1
    } else {
      byDaySeller.set(key, {
        date,
        sellerId: o.sellerId,
        sellerName: o.seller.fullName,
        payout: o.sellerPayout,
        serviceCharge: o.serviceCharge,
        orders: 1,
      })
    }
    platformServiceChargeTotal += o.serviceCharge
    platformPayoutTotal += o.sellerPayout
  }

  const rows = Array.from(byDaySeller.values()).sort((a, b) => b.date.localeCompare(a.date) || b.payout - a.payout)

  return NextResponse.json({
    rows,
    summary: {
      days: daysParam,
      totalOrders: orders.length,
      platformServiceChargeTotal,
      platformPayoutTotal,
    },
  })
}
