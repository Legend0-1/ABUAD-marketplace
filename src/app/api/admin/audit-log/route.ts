import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const action = req.nextUrl.searchParams.get('action')
  const logs = await db.auditLog.findMany({
    where: action ? { action } : {},
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  return NextResponse.json({ logs })
}
