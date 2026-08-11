import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSessionToken } from '@/lib/auth'

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
      },
    })
    res.cookies.set('abuad_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (e: any) {
    console.error('login error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
