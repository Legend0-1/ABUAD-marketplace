import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const request = await db.deliveryRequest.findUnique({ where: { id }, include: { partner: true } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  const isParticipant = request.customerId === user.id || request.partner?.userId === user.id
  if (!isParticipant) return NextResponse.json({ error: 'Not your request' }, { status: 403 })

  const messages = await db.deliveryMessage.findMany({
    where: { requestId: id },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { fullName: true } } },
  })
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Message is empty' }, { status: 400 })

  const request = await db.deliveryRequest.findUnique({ where: { id }, include: { partner: true } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  // Per spec: errand_only jobs have zero customer<->partner communication.
  if (request.type === 'errand_only') {
    return NextResponse.json({ error: 'Direct messaging is not available for errand-only requests — HR coordinates these directly with the partner.' }, { status: 403 })
  }

  const isParticipant = request.customerId === user.id || request.partner?.userId === user.id
  if (!isParticipant) return NextResponse.json({ error: 'Not your request' }, { status: 403 })
  if (!request.partner) return NextResponse.json({ error: 'No partner assigned yet' }, { status: 400 })

  const message = await db.deliveryMessage.create({
    data: { requestId: id, senderId: user.id, body: body.trim() },
  })

  return NextResponse.json({ message })
}
