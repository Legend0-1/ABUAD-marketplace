import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const reports = await db.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, fullName: true, matricNumber: true, department: true } },
      reportedUser: { select: { id: true, fullName: true, matricNumber: true, department: true, isBanned: true } },
    },
  })

  return NextResponse.json({ reports })
}

// Update report status (resolve / dismiss / reviewing)
export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { reportId, status, adminNote } = await req.json()
  const report = await db.report.update({
    where: { id: reportId },
    data: { status, adminNote: adminNote || null },
  })
  return NextResponse.json({ report })
}
