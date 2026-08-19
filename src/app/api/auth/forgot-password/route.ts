import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createPasswordResetToken } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email?.trim()) {
    return NextResponse.json({ error: 'Enter your email address' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  // Always respond the same way whether or not the account exists --
  // otherwise this endpoint becomes a way to check which emails are
  // registered, which is itself a privacy leak.
  if (user) {
    const token = createPasswordResetToken(user.id, user.passwordHash)
    await sendPasswordResetEmail({ email: user.email, fullName: user.fullName, token }).catch((e) =>
      console.error('password reset email failed', e)
    )
  }

  return NextResponse.json({ ok: true, message: 'If an account exists with that email, a reset link has been sent.' })
}
