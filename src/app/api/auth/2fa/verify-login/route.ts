import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionToken, parsePendingTwoFactorToken } from '@/lib/auth'
import { verifyTotp } from '@/lib/totp'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const { pendingToken, code } = await req.json()
    const pending = parsePendingTwoFactorToken(pendingToken)
    if (!pending) {
      return NextResponse.json({ error: 'Your login session expired — please sign in again.' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: pending.userId } })
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'Two-factor authentication is not set up on this account.' }, { status: 400 })
    }
    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account has been suspended. Contact the admin.' }, { status: 403 })
    }

    if (!verifyTotp(user.twoFactorSecret, code)) {
      return NextResponse.json({ error: 'Incorrect code. Check your authenticator app and try again.' }, { status: 400 })
    }

    const token = createSessionToken(user.id)
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        matricNumber: user.matricNumber,
        level: user.level,
        department: user.department,
        profilePicture: user.profilePicture,
        isAdmin: user.isAdmin,
        isHR: user.isHR,
        phone: user.phone,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    })
    res.cookies.set('abuad_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    await logAudit({ actor: { id: user.id, fullName: user.fullName }, action: 'auth.login_2fa', targetType: 'User', targetId: user.id })
    return res
  } catch (e: any) {
    console.error('2fa verify-login error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
