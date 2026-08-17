import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

// Admin can review conversations as part of fraud/safety investigations — disclosed in the Seller Agreement (see src/lib/seed.ts)
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const conversations = await db.conversation.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      participantA: { select: { id: true, fullName: true, profilePicture: true, matricNumber: true, department: true } },
      participantB: { select: { id: true, fullName: true, profilePicture: true, matricNumber: true, department: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: true } },
    },
  })

  return NextResponse.json({ conversations })
}
