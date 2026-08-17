import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSessionToken, createPendingTwoFactorToken } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
    }
    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account has been suspended. Contact the admin.' }, { status: 403 })
    }

    if (user.twoFactorEnabled) {
      // Password is correct, but don't issue a real session yet -- the client
      // must submit a valid TOTP code to /api/auth/2fa/verify-login first.
      const pendingToken = createPendingTwoFactorToken(user.id)
      return NextResponse.json({ requiresTwoFactor: true, pendingToken })
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
        twoFactorEnabled: user.twoFactorEnabled,
      },
    })
    res.cookies.set('abuad_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    await logAudit({ actor: { id: user.id, fullName: user.fullName }, action: 'auth.login', targetType: 'User', targetId: user.id })
    return res
  } catch (e: any) {
    console.error('login error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
