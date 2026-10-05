import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import {
  isValidIdType, requiresBackImage, MAX_ID_IMAGE_CHARS, MAX_FACE_VIDEO_CHARS,
  ID_TYPE_LABELS, type IdType,
} from '@/lib/verification'

// A signed-in user submits (or re-submits, after a rejection) their government
// ID for review, together with a short liveness (facial) video so the admin can
// confirm the person in the video is the person on the document. Images and the
// video arrive as data URLs — the same inline-media pattern used for profile
// pictures and the delivery KYC video — and are stored on the single
// IdVerification row keyed to the user. Treat these as sensitive PII: validate
// the type, cap the size, and never log the bytes.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Already verified? Nothing to do — don't let an approved user overwrite
    // their record with a fresh "pending" one.
    if (user.idVerified) {
      return NextResponse.json({ error: 'Your identity is already verified.' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { idType, frontImageUrl, backImageUrl, faceVideoUrl } = body as {
      idType?: string; frontImageUrl?: string; backImageUrl?: string; faceVideoUrl?: string
    }

    if (!isValidIdType(idType)) {
      return NextResponse.json({ error: 'Choose a valid ID type.' }, { status: 400 })
    }

    // Validate the front image: must be an image data URL, within the size cap.
    if (typeof frontImageUrl !== 'string' || !frontImageUrl.startsWith('data:image')) {
      return NextResponse.json({ error: 'Upload a clear photo of the front of your ID.' }, { status: 400 })
    }
    if (frontImageUrl.length > MAX_ID_IMAGE_CHARS) {
      return NextResponse.json({ error: 'The front image is too large. Please upload a smaller photo (under 5MB).' }, { status: 413 })
    }

    // Back image: required for cards (national ID / voter's card / licence),
    // optional for a single-page passport. Validate it whenever one is supplied.
    const needsBack = requiresBackImage(idType)
    let backUrl: string | null = null
    if (typeof backImageUrl === 'string' && backImageUrl.trim()) {
      if (!backImageUrl.startsWith('data:image')) {
        return NextResponse.json({ error: 'The back image must be a photo.' }, { status: 400 })
      }
      if (backImageUrl.length > MAX_ID_IMAGE_CHARS) {
        return NextResponse.json({ error: 'The back image is too large. Please upload a smaller photo (under 5MB).' }, { status: 413 })
      }
      backUrl = backImageUrl
    }
    if (needsBack && !backUrl) {
      return NextResponse.json({ error: 'Upload a photo of the back of your ID as well.' }, { status: 400 })
    }

    // Liveness video: required, so every reviewed submission carries a clip we
    // can match against the ID photo. Must be a video data URL within the cap.
    if (typeof faceVideoUrl !== 'string' || !faceVideoUrl.startsWith('data:video')) {
      return NextResponse.json({ error: 'Record a short facial video so we can confirm it\'s you.' }, { status: 400 })
    }
    if (faceVideoUrl.length > MAX_FACE_VIDEO_CHARS) {
      return NextResponse.json({ error: 'The video is too large. Please record a shorter clip.' }, { status: 413 })
    }

    // One record per user (userId is unique). Create on first submit; on a
    // re-submit after rejection, overwrite the media and reset to "pending"
    // so it re-enters the admin queue with the review fields cleared.
    const record = await db.idVerification.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        idType: idType as IdType,
        frontImageUrl,
        backImageUrl: backUrl,
        faceVideoUrl,
        status: 'pending',
      },
      update: {
        idType: idType as IdType,
        frontImageUrl,
        backImageUrl: backUrl,
        faceVideoUrl,
        status: 'pending',
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
      },
      select: { id: true, idType: true, status: true, createdAt: true, updatedAt: true },
    })

    await logAudit({
      actor: { id: user.id, fullName: user.fullName },
      action: 'verification.submitted',
      targetType: 'IdVerification',
      targetId: record.id,
      detail: `${user.fullName} submitted ${ID_TYPE_LABELS[idType as IdType]} for review`,
    })

    return NextResponse.json({
      verification: record,
      message: 'Your ID has been submitted for review. We\'ll let you know once it\'s approved — this is usually quick.',
    })
  } catch (e: any) {
    console.error('verification submit error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
