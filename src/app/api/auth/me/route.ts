import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { normalizeCurrency, CURRENCIES } from '@/lib/currency'
import { campusKeyFor, campusLabel } from '@/lib/campus'
import { getCountry, getInstitutionCategories, isKnownCategory, institutionCategoryOf } from '@/lib/institutions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user })
}

// Update the signed-in user's own editable profile fields. Only touches columns
// that already exist on the User model (no migration): fullName, phone, level,
// department, profilePicture. Email / matric number are identity fields and are
// intentionally NOT editable here.
export async function PUT(req: NextRequest) {
  const current = await getCurrentUser()
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data: Record<string, any> = {}

  if (typeof body.fullName === 'string') {
    const v = body.fullName.trim()
    if (!v) return NextResponse.json({ error: 'Full name cannot be empty' }, { status: 400 })
    data.fullName = v.slice(0, 100)
  }
  if (typeof body.phone === 'string') {
    // Optional; empty string clears it.
    data.phone = body.phone.trim().slice(0, 30) || null
  }
  if (typeof body.level === 'string' && body.level.trim()) {
    data.level = body.level.trim().slice(0, 10)
  }
  if (typeof body.department === 'string' && body.department.trim()) {
    data.department = body.department.trim().slice(0, 100)
  }
  if (typeof body.profilePicture === 'string') {
    // Data URL or external URL; empty string clears it. Cap length so an
    // oversized data URL can't bloat the row.
    const v = body.profilePicture.trim()
    if (v && v.length > 2_000_000) {
      return NextResponse.json({ error: 'Profile picture is too large' }, { status: 413 })
    }
    data.profilePicture = v || null
  }
  if (typeof body.currency === 'string' && body.currency.trim()) {
    // Only accept a currency we actually support; anything else is rejected
    // rather than silently stored, so the display layer never sees junk.
    const code = body.currency.trim().toUpperCase()
    if (!CURRENCIES[code]) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
    }
    data.currency = normalizeCurrency(code)
  }

  // Campus. Setting the institution is how a user picks (or changes) the campus
  // that scopes which listings they see. Free text is allowed so a student can
  // type their campus name exactly as their peers do — same name → same campus.
  // When the name matches a catalog institution we also record the catalog
  // country/type; otherwise we keep whatever country they already have.
  let campusChanged = false
  if (typeof body.institution === 'string') {
    const inst = body.institution.trim().slice(0, 150)
    if (!inst) return NextResponse.json({ error: 'Campus name cannot be empty' }, { status: 400 })
    data.institution = inst

    let countryCode = typeof data.country === 'string' ? data.country : current.country
    if (typeof body.country === 'string' && body.country.trim()) {
      const cc = body.country.trim().toUpperCase()
      if (!getCountry(cc)) return NextResponse.json({ error: 'Unsupported country' }, { status: 400 })
      countryCode = cc
      data.country = cc
    }

    // Derive the category from the catalog when we can; otherwise trust an
    // explicit institutionType the client sent, and fall back to null.
    const derived = countryCode ? institutionCategoryOf(countryCode, inst) : null
    if (derived) {
      data.institutionType = derived
    } else if (typeof body.institutionType === 'string' && body.institutionType.trim()) {
      const t = body.institutionType.trim()
      const cats = countryCode ? getInstitutionCategories(countryCode) : []
      data.institutionType = isKnownCategory(countryCode, t) || cats.includes(t as any) ? t : (current.institutionType ?? null)
    }
    campusChanged = true
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db.user.update({ where: { id: current.id }, data })

  // If the campus just changed, re-scope the user's existing storefront(s) so
  // their listings move to the new campus. Best-effort — a user with no
  // storefront simply skips this.
  if (campusChanged && data.institution) {
    const label = campusLabel(data.institution)
    if (label) {
      await db.storefront.updateMany({
        where: { ownerId: current.id },
        data: { campus: label, campusKeys: [campusKeyFor(label)] },
      }).catch(() => {})
    }
  }

  // Return the freshly-derived session user so the client can update its store
  // with exactly the same shape it received from GET.
  const user = await getCurrentUser()
  return NextResponse.json({ user, message: 'Profile updated' })
}
