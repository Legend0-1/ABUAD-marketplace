import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Get all conversations for the current user (as participant A or B),
// including broadcast conversations where user is participantA.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ conversations: [] })

  const conversations = await db.conversation.findMany({
    where: {
      OR: [
        { participantAId: user.id },
        { participantBId: user.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      participantA: { select: { id: true, fullName: true, profilePicture: true, isAdmin: true } },
      participantB: { select: { id: true, fullName: true, profilePicture: true, isAdmin: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  // Annotate each conversation with the "other party" + unread count
  const annotated = await Promise.all(conversations.map(async (c) => {
    const other = c.participantAId === user.id ? c.participantB : c.participantA
    const messageCount = await db.message.count({ where: { conversationId: c.id } })
    return {
      id: c.id,
      type: c.type,
      subject: c.subject,
      otherParty: other,
      lastMessage: c.messages[0] || null,
      messageCount,
      createdAt: c.createdAt,
    }
  }))

  return NextResponse.json({ conversations: annotated })
}

// Start or continue a direct conversation with another user
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { otherUserId, subject, body } = await req.json()
  if (!otherUserId || !body) return NextResponse.json({ error: 'Recipient and message required' }, { status: 400 })

  // Find existing direct conversation
  let conv = await db.conversation.findFirst({
    where: {
      type: 'direct',
      OR: [
        { participantAId: user.id, participantBId: otherUserId },
        { participantAId: otherUserId, participantBId: user.id },
      ],
    },
  })

  if (!conv) {
    conv = await db.conversation.create({
      data: {
        type: 'direct',
        participantAId: user.id,
        participantBId: otherUserId,
        subject: subject || null,
      },
    })
  }

  const message = await db.message.create({
    data: {
      conversationId: conv.id,
      senderId: user.id,
      body,
    },
  })

  return NextResponse.json({ conversationId: conv.id, message })
}
