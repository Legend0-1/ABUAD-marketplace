import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

// Admin views a single conversation's messages (silent oversight)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { id } = await params
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      participantA: { select: { id: true, fullName: true, profilePicture: true, matricNumber: true, department: true } },
      participantB: { select: { id: true, fullName: true, profilePicture: true, matricNumber: true, department: true } },
    },
  })
  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { id: true, fullName: true, profilePicture: true, isAdmin: true } } },
  })

  // Mark messages as admin-seen
  await db.message.updateMany({ where: { conversationId: id, adminSeen: false }, data: { adminSeen: true } })

  return NextResponse.json({ conversation, messages })
}

// Admin sends a message into a user-to-user conversation (rare but allowed)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { id } = await params
  const admin = await db.user.findFirst({ where: { isAdmin: true } })
  if (!admin) return NextResponse.json({ error: 'No admin user' }, { status: 500 })

  const { body } = await req.json()
  if (!body) return NextResponse.json({ error: 'Message body required' }, { status: 400 })

  const message = await db.message.create({
    data: { conversationId: id, senderId: admin.id, body },
  })
  return NextResponse.json({ message })
}
