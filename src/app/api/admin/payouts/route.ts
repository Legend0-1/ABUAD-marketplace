import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { releaseOrderPayout, reconcilePayoutByReference } from '@/lib/payout'
import { getBalance, isPaystackConfigured } from '@/lib/paystack'

// Orders where the buyer has confirmed receipt (or an admin resolved a dispute
// in the seller's favour) but the seller has NOT been fully paid yet. This is
// the queue of money owed that hasn't left the platform balance.
const UNPAID_WHERE = { acknowledged: true, NOT: { payoutStatus: 'success' } } as const

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const orders = await db.order.findMany({
    where: UNPAID_WHERE,
    orderBy: { acknowledgedAt: 'asc' }, // oldest unpaid first
    take: 200,
    include: {
      product: { select: { id: true, title: true } },
      seller: { select: { id: true, fullName: true, email: true } },
      buyer: { select: { id: true, fullName: true } },
      storefront: { select: { id: true, name: true, bankName: true, accountNumber: true, accountName: true, recipientCode: true } },
    },
  })

  // Best-effort: show the platform's settled Paystack balance so the admin can
  // tell at a glance whether there's money available to pay out. Never block the
  // list if Paystack is unreachable or unconfigured.
  let balance: { currency: string; balance: number }[] | null = null
  let balanceError: string | null = null
  if (isPaystackConfigured()) {
    try {
      balance = await getBalance()
    } catch (e: any) {
      balanceError = e?.message || 'Could not load balance'
    }
  } else {
    balanceError = 'Paystack is not configured (PAYSTACK_SECRET_KEY is not set).'
  }

  return NextResponse.json({ orders, count: orders.length, balance, balanceError, paystackConfigured: isPaystackConfigured() })
}

// Act on a stuck payout: retry it, finalize an OTP transfer, or just re-check
// its status against Paystack.
export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { orderId, action, otp } = await req.json()
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true, reference: true, sellerPayout: true, transferReference: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (action === 'reconcile') {
    if (!order.transferReference) {
      return NextResponse.json({ error: 'No transfer has been attempted for this order yet. Use "Retry payout" to start one.' }, { status: 400 })
    }
    await reconcilePayoutByReference(order.transferReference)
    const fresh = await db.order.findUnique({ where: { id: orderId }, select: { payoutStatus: true, payoutError: true } })
    await logAudit({ actor: admin, action: 'payout.reconcile', targetType: 'Order', targetId: orderId, detail: `${order.reference}: re-checked -> ${fresh?.payoutStatus}` })
    return NextResponse.json({ payoutStatus: fresh?.payoutStatus, message: `Status re-checked with Paystack: ${fresh?.payoutStatus}.` })
  }

  if (action === 'finalize') {
    if (!otp || !String(otp).trim()) {
      return NextResponse.json({ error: 'Enter the OTP Paystack sent you.' }, { status: 400 })
    }
    const outcome = await releaseOrderPayout(orderId, { otp: String(otp) })
    await logAudit({ actor: admin, action: 'payout.finalize', targetType: 'Order', targetId: orderId, detail: `${order.reference}: ₦${order.sellerPayout.toLocaleString()} -> ${outcome.payoutStatus} (${outcome.message})` })
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 })
  }

  if (action === 'retry' || !action) {
    const outcome = await releaseOrderPayout(orderId)
    await logAudit({ actor: admin, action: 'payout.retry', targetType: 'Order', targetId: orderId, detail: `${order.reference}: ₦${order.sellerPayout.toLocaleString()} -> ${outcome.payoutStatus} (${outcome.message})` })
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
