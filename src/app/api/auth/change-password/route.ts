import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const fullUser = await db.user.findUnique({ where: { id: user.id } })
  if (!fullUser || !verifyPassword(currentPassword, fullUser.passwordHash)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }
  if (verifyPassword(newPassword, fullUser.passwordHash)) {
    return NextResponse.json({ error: 'New password must be different from your current password' }, { status: 400 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  })

  await logAudit({ actor: user, action: 'user.password_changed', targetType: 'User', targetId: user.id })
  return NextResponse.json({ ok: true })
}
