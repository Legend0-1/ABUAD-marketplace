import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, body, parentId } = await req.json()
  if (!productId || !body) return NextResponse.json({ error: 'Product and body required' }, { status: 400 })

  const comment = await db.comment.create({
    data: { productId, userId: user.id, body, parentId: parentId || null },
  })

  return NextResponse.json({ comment })
}
