import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { peekPasswordResetToken, verifyPasswordResetFingerprint, hashPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json()

  const peeked = peekPasswordResetToken(token)
  if (!peeked) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired. Request a new one.' }, { status: 400 })
  }
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: peeked.userId } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  if (!verifyPasswordResetFingerprint(peeked.pwFingerprint, user.passwordHash)) {
    return NextResponse.json({ error: 'This reset link has already been used, or your password has changed since it was sent. Request a new one.' }, { status: 400 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  })

  await logAudit({ actor: user, action: 'user.password_reset', targetType: 'User', targetId: user.id })

  return NextResponse.json({ ok: true })
}
