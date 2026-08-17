import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminOrHR } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrHR()
  } catch {
    return NextResponse.json({ error: 'Admin or HR only' }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get('status')
  const partners = await db.deliveryPartnerProfile.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullName: true, matricNumber: true, department: true, level: true, email: true } } },
  })

  return NextResponse.json({ partners })
}
