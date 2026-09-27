import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bootstrapMarketplace } from '@/lib/bootstrap'
import { getCurrentUser } from '@/lib/session'

// Triggers marketplace bootstrap (admin + categories + agreement + demo data).
// Safe to call multiple times (idempotent), but it must NOT be a public
// endpoint — otherwise anyone could hammer it. Access is allowed only when:
//   1. the database is empty (genuine first-run, before any admin exists), or
//   2. the caller presents the shared SEED_SECRET (header or ?secret=), or
//   3. the caller is a logged-in admin.
async function authorizeSeed(req: NextRequest): Promise<boolean> {
  // 1. First run — no users yet, so there's no admin to authenticate as.
  try {
    const userCount = await db.user.count()
    if (userCount === 0) return true
  } catch {
    // If the count query fails (e.g. DB not migrated yet) treat it as first run
    // so a fresh deploy can still bootstrap.
    return true
  }

  // 2. Shared secret configured in the deploy environment.
  const secret = process.env.SEED_SECRET
  if (secret) {
    const provided = req.headers.get('x-seed-secret') || req.nextUrl.searchParams.get('secret')
    if (provided && provided === secret) return true
  }

  // 3. Authenticated admin.
  const user = await getCurrentUser().catch(() => null)
  if (user?.isAdmin) return true

  return false
}

async function runSeed(req: NextRequest) {
  if (!(await authorizeSeed(req))) {
    return NextResponse.json({ error: 'Not authorized to run bootstrap.' }, { status: 403 })
  }
  try {
    await bootstrapMarketplace()
    return NextResponse.json({ ok: true, message: 'Marketplace bootstrapped' })
  } catch (e: any) {
    console.error('seed error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return runSeed(req)
}

export async function GET(req: NextRequest) {
  return runSeed(req)
}
