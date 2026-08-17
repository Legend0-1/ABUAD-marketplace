import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Admin broadcast: send a message to every user individually OR as a single broadcast conversation.
// We implement as a per-user admin_direct conversation for simplicity (each user gets the message in their own inbox).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { subject, body, userIds } = await req.json()
  if (!body) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

  // If userIds is provided, broadcast to those users; otherwise broadcast to everyone.
  const targetUsers = userIds && userIds.length > 0
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true } })
    : await db.user.findMany({ where: { isBanned: false, isAdmin: false }, select: { id: true } })

  let count = 0
  for (const u of targetUsers) {
    let conv = await db.conversation.findFirst({
      where: { type: 'admin_direct', participantAId: user.id, participantBId: u.id },
    })
    if (!conv) {
      conv = await db.conversation.create({
        data: {
          type: 'admin_direct',
          participantAId: user.id,
          participantBId: u.id,
          subject: subject || 'Message from UNI MART Admin',
        },
      })
    }
    await db.message.create({
      data: { conversationId: conv.id, senderId: user.id, body },
    })
    count++
  }

  return NextResponse.json({ count, total: targetUsers.length })
}
