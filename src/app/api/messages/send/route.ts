import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(req, 'sendMessage')
  if (!rl.allowed) return NextResponse.json({ error: 'You are sending messages too quickly. Please slow down.' }, { status: 429 })

  const { conversationId, body } = await req.json()
  if (!conversationId || !body) return NextResponse.json({ error: 'Conversation and message required' }, { status: 400 })

  // Verify user is a participant (or admin)
  const conv = await db.conversation.findUnique({ where: { id: conversationId } })
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const isParticipant = conv.participantAId === user.id || conv.participantBId === user.id
  if (!isParticipant && !user.isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const message = await db.message.create({
    data: { conversationId, senderId: user.id, body },
  })

  return NextResponse.json({ message })
}
