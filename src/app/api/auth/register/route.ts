import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createEmailVerificationToken } from '@/lib/auth'
import { bootstrapMarketplace } from '@/lib/bootstrap'
import { generateUniqueReferralCode } from '@/lib/referral'
import { sendVerificationEmail, sendRegistrationPendingEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const { allowed, retryAfterSeconds } = await checkRateLimit(req, 'register')
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts from this network. Try again in about ${Math.ceil((retryAfterSeconds || 60) / 60)} minute(s).` },
        { status: 429 }
      )
    }

    // Ensure marketplace is bootstrapped (admin + categories + agreement + referral code backfill)
    await bootstrapMarketplace()

    const body = await req.json()
    const { email, password, fullName, matricNumber, level, department, profilePicture, referralCode, phone } = body

    if (!email || !password || !fullName || !matricNumber || !level || !department || !phone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!/^[\d+\s()-]{7,20}$/.test(String(phone).trim())) {
      return NextResponse.json({ error: 'Enter a valid WhatsApp number' }, { status: 400 })
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
        department: department.trim(),
        phone: String(phone).trim(),
        profilePicture: profilePicture || null,
        referralCode: newReferralCode,
        referredById: referrer.id,
      },
    })

    const verifyToken = createEmailVerificationToken(user.id, user.email)
    await sendVerificationEmail({ email: user.email, fullName: user.fullName, token: verifyToken }).catch((e) =>
      console.error('verification email failed', e)
    )
    await sendRegistrationPendingEmail({ email: user.email, fullName: user.fullName }).catch((e) =>
      console.error('pending-approval email failed', e)
    )

    await logAudit({ actor: null, action: 'user.registered', targetType: 'User', targetId: user.id, detail: `${user.fullName} (${user.email}) — awaiting approval` })

    // No session is issued here -- new accounts require admin approval before
    // they can log in at all. See /api/auth/login for the isApproved gate.
    return NextResponse.json({
      pendingApproval: true,
      message: 'Registration received! Your account needs a quick admin approval before you can log in — you\'ll get an email the moment it\'s approved.',
    })
  } catch (e: any) {
    console.error('register error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
