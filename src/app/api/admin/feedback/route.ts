import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const feedback = await db.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { fullName: true, email: true } } },
  })

  return NextResponse.json({ feedback })
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { id, status } = await req.json()
  await db.feedback.update({ where: { id }, data: { status } })
  return NextResponse.json({ ok: true })
}
