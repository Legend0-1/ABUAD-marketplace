import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Get full message history for a conversation
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ messages: [] })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')
  if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

  const conv = await db.conversation.findUnique({ where: { id: conversationId } })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isParticipant = conv.participantAId === user.id || conv.participantBId === user.id
  if (!isParticipant && !user.isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { id: true, fullName: true, profilePicture: true, isAdmin: true } } },
  })

  // Annotate the conversation with both participants for the UI
  const conversation = {
    ...conv,
    participantA: await db.user.findUnique({ where: { id: conv.participantAId }, select: { id: true, fullName: true, profilePicture: true, isAdmin: true, department: true, level: true } }),
    participantB: conv.participantBId
      ? await db.user.findUnique({ where: { id: conv.participantBId }, select: { id: true, fullName: true, profilePicture: true, isAdmin: true, department: true, level: true } })
      : null,
  }

  return NextResponse.json({ messages, conversation })
}
