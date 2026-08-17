import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.deliveryPartnerProfile.findUnique({ where: { userId: user.id } })
  if (existing) return NextResponse.json({ error: 'You have already registered as a delivery partner' }, { status: 400 })

  const { videoUrl, bankName, accountName, accountNumber, baseFeeNote } = await req.json()
  if (!videoUrl || !bankName || !accountName || !accountNumber) {
    return NextResponse.json({ error: 'Video, and bank details are all required' }, { status: 400 })
  }
  if (!videoUrl.startsWith('data:video')) {
    return NextResponse.json({ error: 'Please upload a video for identity verification' }, { status: 400 })
  }

  const profile = await db.deliveryPartnerProfile.create({
    data: {
      userId: user.id,
      videoUrl,
      bankName,
      accountName,
      accountNumber,
      baseFeeNote: baseFeeNote || null,
      status: 'pending_review',
    },
  })

  return NextResponse.json({ profile })
}
