import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { sendAccountApprovedEmail, sendAccountRejectedEmail } from '@/lib/email'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const pending = await db.user.findMany({
    where: { isApproved: false, rejectedAt: null },
    orderBy: { createdAt: 'asc' }, // oldest-first — fair queue order
    select: {
      id: true, fullName: true, email: true, matricNumber: true, phone: true,
      level: true, department: true, profilePicture: true, createdAt: true, referredById: true,
    },
  })

  return NextResponse.json({ pending })
}

export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const { action, reason } = body
  const userIds: string[] = body.userIds || (body.userId ? [body.userId] : [])
  if (userIds.length === 0) return NextResponse.json({ error: 'No users specified' }, { status: 400 })

  const users = await db.user.findMany({ where: { id: { in: userIds } } })
  let succeeded = 0

  for (const user of users) {
    if (action === 'approve') {
      await db.user.update({
        where: { id: user.id },
        data: { isApproved: true, approvedAt: new Date(), approvedById: admin.id, rejectedAt: null, rejectionReason: null },
      })
      await sendAccountApprovedEmail({ email: user.email, fullName: user.fullName }).catch((e) => console.error('approval email failed', e))
      await logAudit({ actor: admin, action: 'user.approve_registration', targetType: 'User', targetId: user.id, detail: user.fullName })
      succeeded++
    } else if (action === 'reject') {
      await db.user.update({
        where: { id: user.id },
        data: { isApproved: false, rejectedAt: new Date(), rejectionReason: reason || null },
      })
      await sendAccountRejectedEmail({ email: user.email, fullName: user.fullName, reason }).catch((e) => console.error('rejection email failed', e))
      await logAudit({ actor: admin, action: 'user.reject_registration', targetType: 'User', targetId: user.id, detail: `${user.fullName}${reason ? ` — ${reason}` : ''}` })
      succeeded++
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true, count: succeeded })
}
