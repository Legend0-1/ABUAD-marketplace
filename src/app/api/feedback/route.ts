import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, message } = await req.json()
  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Please write your feedback before submitting' }, { status: 400 })
  }

  await db.feedback.create({
    data: {
      userId: user.id,
      category: category || 'suggestion',
      message: message.trim(),
    },
  })

  return NextResponse.json({ ok: true })
}
