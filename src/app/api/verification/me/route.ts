import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// The signed-in user's own verification status. Deliberately omits the ID image
// data URLs — the user doesn't need their own documents re-downloaded just to see
// whether they're approved, and leaving the heavy bytes out keeps this cheap to
// poll. `idVerified` is the authoritative gate flag.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await db.idVerification.findUnique({
    where: { userId: user.id },
    select: {
      idType: true,
      status: true,
      rejectionReason: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ idVerified: user.idVerified, verification: record })
}
