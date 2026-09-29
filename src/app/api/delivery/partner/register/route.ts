import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { tryVerifyAccount } from '@/lib/paystack'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.deliveryPartnerProfile.findUnique({ where: { userId: user.id } })
  if (existing) return NextResponse.json({ error: 'You have already registered as a delivery partner' }, { status: 400 })

  const { videoUrl, bankName, bankCode, accountName, accountNumber, baseFeeNote, deliveryFee } = await req.json()
  if (!videoUrl || !bankName || !accountName || !accountNumber) {
    return NextResponse.json({ error: 'Video, and bank details are all required' }, { status: 400 })
  }
  if (!videoUrl.startsWith('data:video')) {
    return NextResponse.json({ error: 'Please upload a video for identity verification' }, { status: 400 })
  }

  // Delivery fee is what customers see and pick by, so it must be a sane positive amount.
  const fee = Number(deliveryFee)
  if (!Number.isFinite(fee) || fee <= 0) {
    return NextResponse.json({ error: 'Enter your delivery fee (a positive amount in naira)' }, { status: 400 })
  }
  if (fee > 1_000_000) {
    return NextResponse.json({ error: 'That delivery fee looks too high' }, { status: 400 })
  }

  // Best-effort server-side account verification so the stored account name is
  // the bank's authoritative one. Falls back to submitted values if we can't verify.
  const verified = await tryVerifyAccount({ bankName, bankCode, accountNumber })

  const profile = await db.deliveryPartnerProfile.create({
    data: {
      userId: user.id,
      videoUrl,
      bankName,
      bankCode: verified?.bankCode || bankCode || null,
      accountName: verified?.accountName || accountName,
      accountNumber,
      baseFeeNote: baseFeeNote || null,
      deliveryFee: fee,
      status: 'pending_review',
    },
  })

  return NextResponse.json({ profile })
}
