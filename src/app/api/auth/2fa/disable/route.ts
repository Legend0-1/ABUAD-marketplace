import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { verifyPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await req.json()
  const fullUser = await db.user.findUnique({ where: { id: user.id } })
  if (!fullUser || !verifyPassword(password || '', fullUser.passwordHash)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 400 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  })

  await logAudit({ actor: user, action: 'user.2fa_disabled', targetType: 'User', targetId: user.id })
  return NextResponse.json({ ok: true })
}
