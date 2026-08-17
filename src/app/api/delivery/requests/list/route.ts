import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const partnerProfile = await db.deliveryPartnerProfile.findUnique({ where: { userId: user.id } })

  const [asCustomer, asPartner] = await Promise.all([
    db.deliveryRequest.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { partner: { select: { id: true, trustScore: true, user: { select: { fullName: true } } } } },
    }),
    partnerProfile
      ? db.deliveryRequest.findMany({
          where: { partnerId: partnerProfile.id },
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { fullName: true } } },
        })
      : Promise.resolve([]),
  ])

  return NextResponse.json({ asCustomer, asPartner })
}
