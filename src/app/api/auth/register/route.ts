import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSessionToken } from '@/lib/auth'
import { bootstrapMarketplace } from '@/lib/bootstrap'
import { generateUniqueReferralCode } from '@/lib/referral'

export async function POST(req: NextRequest) {
  try {
    // Ensure marketplace is bootstrapped (admin + categories + agreement + referral code backfill)
    await bootstrapMarketplace()

    const body = await req.json()
    const { email, password, fullName, matricNumber, level, department, profilePicture, referralCode } = body

    if (!email || !password || !fullName || !matricNumber || !level || !department) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!referralCode?.trim()) {
      return NextResponse.json({ error: 'A referral code is required to join UNI MART' }, { status: 400 })
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { matricNumber: matricNumber.toUpperCase() }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'A user with this email or matric number already exists' }, { status: 400 })
    }

    const referrer = await db.user.findUnique({ where: { referralCode: referralCode.trim().toUpperCase() } })
    if (!referrer) {
      return NextResponse.json({ error: 'That referral code doesn\'t match any account. Double-check it with whoever gave it to you.' }, { status: 400 })
    }

    const newReferralCode = await generateUniqueReferralCode()

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        fullName,
        matricNumber: matricNumber.toUpperCase(),
        level,
        department,
        profilePicture: profilePicture || null,
        referralCode: newReferralCode,
        referredById: referrer.id,
      },
    })

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
    console.error('register error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
