import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reportedUserId, productId, reason, details } = await req.json()
  if (!reportedUserId || !reason) {
    return NextResponse.json({ error: 'Reported user and reason required' }, { status: 400 })
  }

  const report = await db.report.create({
    data: {
      reporterId: user.id,
      reportedUserId,
      productId: productId || null,
      reason,
      details: details || '',
    },
  })

  return NextResponse.json({ report, message: 'Report submitted. The admin has been notified and will review your case.' })
}
