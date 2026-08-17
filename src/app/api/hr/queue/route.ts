import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminOrHR } from '@/lib/session'

export async function GET() {
  try {
    await requireAdminOrHR()
  } catch {
    return NextResponse.json({ error: 'Admin or HR only' }, { status: 403 })
  }

  const [pendingRequests, activeRequests, availablePartners] = await Promise.all([
    db.deliveryRequest.findMany({
      where: { status: 'pending_hr' },
      orderBy: { paidAt: 'asc' }, // oldest-paid-first, fair queue order
      include: { customer: { select: { fullName: true, department: true } } },
    }),
    db.deliveryRequest.findMany({
      where: { status: { in: ['awaiting_partner', 'in_progress'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { fullName: true } },
        partner: { select: { id: true, user: { select: { fullName: true } } } },
      },
    }),
    db.deliveryPartnerProfile.findMany({
      where: { status: 'approved' },
      select: { id: true, trustScore: true, typeAEligible: true, user: { select: { fullName: true, department: true, level: true } } },
    }),
  ])

  return NextResponse.json({ pendingRequests, activeRequests, availablePartners })
}
