import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { verifyTotp } from '@/lib/totp'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { secret, code } = await req.json()
  if (!secret || !code) return NextResponse.json({ error: 'Missing secret or code' }, { status: 400 })

  if (!verifyTotp(secret, code)) {
    return NextResponse.json({ error: 'Incorrect code. Make sure your authenticator app and phone clock are both correct.' }, { status: 400 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: true },
  })

  await logAudit({ actor: user, action: 'user.2fa_enabled', targetType: 'User', targetId: user.id })
  return NextResponse.json({ ok: true })
}
