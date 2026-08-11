import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  const cats = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: { where: { status: 'active' } } } },
    },
  })
  return NextResponse.json({ categories: cats })
}

// Admin-only: create a custom category
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const { name, description, icon, requiresApproval } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const cat = await db.category.create({
    data: { name, slug, description: description || '', icon: icon || null, requiresApproval: !!requiresApproval, origin: 'custom' },
  })
  return NextResponse.json({ category: cat })
}
