import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get('status')
  const commissions = await db.referralCommission.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      referrer: { select: { fullName: true, email: true } },
      referredUser: { select: { fullName: true } },
    },
  })

  const pendingTotal = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.commissionAmount, 0)

  return NextResponse.json({ commissions, pendingTotal })
}

export async function PATCH(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { id, status } = await req.json() // status: "paid" | "cancelled"
  if (!['paid', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const commission = await db.referralCommission.update({
    where: { id },
    data: { status, paidAt: status === 'paid' ? new Date() : null, paidById: status === 'paid' ? admin.id : null },
    include: { referrer: { select: { fullName: true } } },
  })

  await logAudit({
    actor: admin,
    action: `referral.${status}`,
    targetType: 'ReferralCommission',
    targetId: id,
    detail: `₦${commission.commissionAmount.toLocaleString()} to ${commission.referrer.fullName}`,
  })

  return NextResponse.json({ commission })
}
