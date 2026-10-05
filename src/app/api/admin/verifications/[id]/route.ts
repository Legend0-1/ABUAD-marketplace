import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Full detail for one verification record, INCLUDING the ID image data URLs and
// the liveness video. Separated from the list endpoint so the heavy, sensitive
// media is fetched only when an admin actually opens a specific submission.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { id } = await params
  const record = await db.idVerification.findUnique({
    where: { id },
    select: {
      id: true, idType: true, status: true, frontImageUrl: true, backImageUrl: true,
      faceVideoUrl: true,
      rejectionReason: true, reviewedAt: true, createdAt: true, updatedAt: true,
      user: { select: { id: true, fullName: true, email: true, matricNumber: true, institution: true } },
    },
  })
  if (!record) return NextResponse.json({ error: 'Verification not found' }, { status: 404 })

  return NextResponse.json({ verification: record })
}
