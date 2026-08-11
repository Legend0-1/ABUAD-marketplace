import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'

// Admin sends an email to a user — simulated (no real SMTP in sandbox).
// We record the intent in the response and also create an admin_direct inbox message.
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { userId, subject, body } = await req.json()
  if (!userId || !subject || !body) {
    return NextResponse.json({ error: 'User, subject and body required' }, { status: 400 })
  }

  const admin = await db.user.findFirst({ where: { isAdmin: true } })
  if (!admin) return NextResponse.json({ error: 'No admin user' }, { status: 500 })

  // Create admin_direct conversation & message (acts as email inbox in-app)
  let conv = await db.conversation.findFirst({
    where: { type: 'admin_direct', participantAId: admin.id, participantBId: userId },
  })
  if (!conv) {
    conv = await db.conversation.create({
      data: { type: 'admin_direct', participantAId: admin.id, participantBId: userId, subject: subject },
    })
  }

  const message = await db.message.create({
    data: {
      conversationId: conv.id,
      senderId: admin.id,
      body: `📧 EMAIL — ${subject}\n\n${body}`,
    },
  })

  return NextResponse.json({ ok: true, message: 'Email sent (simulated — also delivered to user inbox).' })
}
