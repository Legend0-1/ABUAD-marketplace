import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { createEmailVerificationToken } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { allowed, retryAfterSeconds } = await checkRateLimit(req, 'resendVerification')
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in about ${Math.ceil((retryAfterSeconds || 60) / 60)} minute(s).` },
      { status: 429 }
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fullUser = await db.user.findUnique({ where: { id: user.id } })
  if (!fullUser) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  if (fullUser.emailVerified) {
    return NextResponse.json({ error: 'This email is already verified' }, { status: 400 })
  }

  const token = createEmailVerificationToken(fullUser.id, fullUser.email)
  await sendVerificationEmail({ email: fullUser.email, fullName: fullUser.fullName, token })

  return NextResponse.json({ ok: true })
}
