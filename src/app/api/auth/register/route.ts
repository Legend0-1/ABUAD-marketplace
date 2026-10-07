import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createEmailVerificationToken } from '@/lib/auth'
import { bootstrapMarketplace } from '@/lib/bootstrap'
import { generateUniqueReferralCode } from '@/lib/referral'
import { sendVerificationEmail, sendRegistrationPendingEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'
import { getEnabledCountryCodes } from '@/lib/settings'
import { getCountry, getCountryCurrency, institutionCategoryOf, getInstitutionCategories, isKnownCategory } from '@/lib/institutions'
import { normalizeCurrency } from '@/lib/currency'

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
    const { email, password, fullName, matricNumber, level, department, profilePicture, referralCode, phone, country, institutionCategory, institution } = body

    if (!email || !password || !fullName || !matricNumber || !level || !department || !phone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!/^[\d+\s()-]{7,20}$/.test(String(phone).trim())) {
      return NextResponse.json({ error: 'Enter a valid WhatsApp number' }, { status: 400 })
    }

    // Country + institution. The platform is multi-country; the admin controls
    // which countries are open for registration. Validate the submitted country
    // against the enabled list + catalog, and keep the institution as free text
    // (a known catalog name, or an "Other" value the student typed in).
    const countryCode = String(country || '').trim().toUpperCase()
    const institutionCat = String(institutionCategory || '').trim()
    const institutionName = String(institution || '').trim()
    if (!countryCode || !institutionName) {
      return NextResponse.json({ error: 'Country and institution are required' }, { status: 400 })
    }
    const enabledCountries = await getEnabledCountryCodes()
    if (!getCountry(countryCode) || !enabledCountries.includes(countryCode)) {
      return NextResponse.json({ error: 'Registration is not open for the selected country yet' }, { status: 400 })
    }
    // Require an institution type when the country actually has categories.
    if (getInstitutionCategories(countryCode).length > 0 && !institutionCat) {
      return NextResponse.json({ error: 'Please select your institution type' }, { status: 400 })
    }
    // Resolve the stored institution type: trust the catalog for a listed school;
    // otherwise fall back to the category the student picked (if it's a real one).
    // A free-typed school under "Other / Not listed" stays null.
    const institutionType =
      institutionCategoryOf(countryCode, institutionName) ??
      (isKnownCategory(countryCode, institutionCat) ? institutionCat : null)
    // Default the user's display currency to their country's local currency.
    const currency = normalizeCurrency(getCountryCurrency(countryCode))

    const existing = await db.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { matricNumber: matricNumber.toUpperCase() }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'A user with this email or matric number already exists' }, { status: 400 })
    }

    // Referral is optional. If a code is supplied it must be valid; if it's left
    // blank, the user simply joins without a referrer.
    const referralInput = referralCode?.trim()
    const referrer = referralInput
      ? await db.user.findUnique({ where: { referralCode: referralInput.toUpperCase() } })
      : null
    if (referralInput && !referrer) {
      return NextResponse.json({ error: 'That referral code doesn\'t match any account. Double-check it, or leave it blank to continue without one.' }, { status: 400 })
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
        referredById: referrer?.id ?? null,
        country: countryCode,
        institution: institutionName,
        institutionType: institutionType ?? null,
        currency,
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
