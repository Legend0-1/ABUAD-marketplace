import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { getDeliveryFlatFee } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/**
 * GET /api/delivery/partners?type=buy_and_deliver|errand_only
 *
 * Returns the list of delivery partners a customer can choose from, with each
 * partner's own delivery fee, plus the current platform flat fee. This powers
 * the "pick a partner" step (item 5) that replaces the old "how much are you
 * willing to pay?" input.
 *
 * Only approved + available partners are listed. For buy_and_deliver jobs, only
 * Type-A–eligible partners are shown (they can be advanced the item cost).
 * No bank details or KYC video are ever exposed here.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') || ''
  const requireTypeA = type === 'buy_and_deliver'

  const partners = await db.deliveryPartnerProfile.findMany({
    where: {
      status: 'approved',
      isAvailable: true,
      deliveryFee: { not: null },
      ...(requireTypeA ? { typeAEligible: true } : {}),
    },
    select: {
      id: true,
      deliveryFee: true,
      baseFeeNote: true,
      trustScore: true,
      typeAEligible: true,
      user: { select: { fullName: true, profilePicture: true } },
      _count: { select: { requests: true } },
    },
    orderBy: [{ deliveryFee: 'asc' }, { trustScore: 'desc' }],
  })

  const flatFee = await getDeliveryFlatFee()

  const list = partners.map((p) => ({
    id: p.id,
    fullName: p.user.fullName,
    profilePicture: p.user.profilePicture,
    deliveryFee: p.deliveryFee,
    note: p.baseFeeNote,
    trustScore: p.trustScore,
    typeAEligible: p.typeAEligible,
    jobsCount: p._count.requests,
  }))

  return NextResponse.json({ partners: list, flatFee })
}
