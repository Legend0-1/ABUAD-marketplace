import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { normalizeCurrency, CURRENCIES } from '@/lib/currency'

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

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db.user.update({ where: { id: current.id }, data })

  // Return the freshly-derived session user so the client can update its store
  // with exactly the same shape it received from GET.
  const user = await getCurrentUser()
  return NextResponse.json({ user, message: 'Profile updated' })
}
