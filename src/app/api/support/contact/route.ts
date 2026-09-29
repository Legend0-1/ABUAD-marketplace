import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * Contact Admin / Support (item 6). Lets any signed-in user send a message to
 * the platform team without needing to know an admin's user ID. We route it
 * into the same `admin_direct` conversation type the admin already uses, so:
 *   - the user sees it in their inbox as "UNI MART Admin" and can keep replying,
 *   - every admin sees it in the Admin > Messages tab and can reply from there.
 *
 * Each user gets one stable support thread (reused on repeat contact) tied to
 * the earliest-created admin as the canonical recipient.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Reuse the message limiter — same abuse surface (spam/flooding).
  const rl = await checkRateLimit(req, 'sendMessage')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'You are sending messages too quickly. Please slow down.' }, { status: 429 })
  }

  const { subject, body, category } = await req.json()
  if (!body || !body.trim()) {
    return NextResponse.json({ error: 'Please describe your issue' }, { status: 400 })
  }
  if (body.trim().length > 4000) {
    return NextResponse.json({ error: 'Message is too long (max 4000 characters)' }, { status: 400 })
  }

  // Canonical support recipient: the earliest-created admin. Any admin can still
  // read and reply (admin oversight covers every conversation).
  const admin = await db.user.findFirst({
    where: { isAdmin: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (!admin) {
    return NextResponse.json({ error: 'Support is temporarily unavailable. Please try again later.' }, { status: 503 })
  }
  if (admin.id === user.id) {
    return NextResponse.json({ error: 'You are an admin — manage messages from the admin dashboard.' }, { status: 400 })
  }

  // One support thread per user (reused on repeat contact).
  let conv = await db.conversation.findFirst({
    where: { type: 'admin_direct', participantAId: admin.id, participantBId: user.id },
  })
  if (!conv) {
    conv = await db.conversation.create({
      data: {
        type: 'admin_direct',
        participantAId: admin.id,
        participantBId: user.id,
        subject: (subject && subject.trim()) || 'Support request',
      },
    })
  }

  // Fold the optional category + subject into the message body so the whole
  // request is preserved even though the thread is reused across topics.
  const parts: string[] = []
  const headline = [category && category.trim() ? `[${category.trim()}]` : '', subject && subject.trim() ? subject.trim() : '']
    .filter(Boolean)
    .join(' ')
  if (headline) parts.push(headline)
  parts.push(body.trim())
  const composed = parts.join('\n\n')

  await db.message.create({
    data: { conversationId: conv.id, senderId: user.id, body: composed },
  })

  return NextResponse.json({ conversationId: conv.id })
}
