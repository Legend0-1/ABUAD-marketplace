import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { ID_TYPE_LABELS, type IdType } from '@/lib/verification'

export const dynamic = 'force-dynamic'

const USER_SELECT = {
  id: true, fullName: true, email: true, matricNumber: true,
  institution: true, country: true, profilePicture: true, idVerified: true,
} as const

// List metadata only — never the heavy ID-image data URLs. The admin pulls a
// single record's images on demand from /api/admin/verifications/[id] when they
// actually open it to review, which keeps this queue light and limits how widely
// the sensitive images are shipped around.
const LIST_SELECT = {
  id: true, idType: true, status: true, rejectionReason: true,
  reviewedAt: true, createdAt: true, updatedAt: true,
  user: { select: USER_SELECT },
} as const

// List the identity-verification queue for admins. `?count=1` returns only the
// pending count (used for the dashboard tab badge).
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const pendingCount = await db.idVerification.count({ where: { status: 'pending' } })
  if (new URL(req.url).searchParams.get('count')) {
    return NextResponse.json({ count: pendingCount })
  }

  // The actionable queue: pending first, oldest at the top. Plus a short tail of
  // recently reviewed records for context.
  const [pending, reviewed] = await Promise.all([
    db.idVerification.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: LIST_SELECT,
    }),
    db.idVerification.findMany({
      where: { status: { not: 'pending' } },
      orderBy: { reviewedAt: 'desc' },
      take: 20,
      select: LIST_SELECT,
    }),
  ])

  return NextResponse.json({ pending, reviewed, count: pendingCount })
}

// Approve or reject one submission. Approving flips the user's denormalized
// `idVerified` gate flag on; rejecting (with a required reason) flips it off and
// records why, so the user sees the reason and can re-submit. Both writes happen
// in one transaction so the record status and the gate flag can never disagree.
export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { verificationId, action, rejectionReason } = await req.json().catch(() => ({}))
  if (!verificationId) {
    return NextResponse.json({ error: 'verificationId is required' }, { status: 400 })
  }

  const record = await db.idVerification.findUnique({
    where: { id: verificationId },
    include: { user: { select: { id: true, fullName: true } } },
  })
  if (!record) return NextResponse.json({ error: 'Verification not found' }, { status: 404 })

  const typeLabel = ID_TYPE_LABELS[record.idType as IdType] || record.idType

  if (action === 'approve') {
    await db.$transaction([
      db.idVerification.update({
        where: { id: record.id },
        data: { status: 'approved', reviewedById: admin.id, reviewedAt: new Date(), rejectionReason: null },
      }),
      db.user.update({ where: { id: record.userId }, data: { idVerified: true } }),
    ])
    await logAudit({
      actor: admin, action: 'verification.approved', targetType: 'IdVerification', targetId: record.id,
      detail: `Approved ${record.user.fullName}'s ${typeLabel}`,
    })
    return NextResponse.json({ ok: true, status: 'approved', message: `${record.user.fullName}'s identity is verified.` })
  }

  if (action === 'reject') {
    const reason = String(rejectionReason || '').trim()
    if (!reason) {
      return NextResponse.json({ error: 'Give a reason for rejecting so the user knows what to fix.' }, { status: 400 })
    }
    await db.$transaction([
      db.idVerification.update({
        where: { id: record.id },
        data: { status: 'rejected', reviewedById: admin.id, reviewedAt: new Date(), rejectionReason: reason.slice(0, 500) },
      }),
      db.user.update({ where: { id: record.userId }, data: { idVerified: false } }),
    ])
    await logAudit({
      actor: admin, action: 'verification.rejected', targetType: 'IdVerification', targetId: record.id,
      detail: `Rejected ${record.user.fullName}'s ${typeLabel}: ${reason.slice(0, 120)}`,
    })
    return NextResponse.json({ ok: true, status: 'rejected', message: `${record.user.fullName}'s submission was rejected.` })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
