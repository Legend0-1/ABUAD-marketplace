import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [referralCount, commissions] = await Promise.all([
    db.user.count({ where: { referredById: user.id } }),
    db.referralCommission.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const totalEarned = commissions.reduce((sum, c) => sum + c.commissionAmount, 0)
  const totalPaid = commissions.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.commissionAmount, 0)
  const totalPending = commissions.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.commissionAmount, 0)

  return NextResponse.json({
    referralCode: user.referralCode,
    referralCount,
    totalEarned,
    totalPaid,
    totalPending,
    commissions,
  })
}
