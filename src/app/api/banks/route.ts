import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { isPaystackConfigured, listBanks } from '@/lib/paystack'
import { FALLBACK_NIGERIAN_BANKS } from '@/lib/nigeria-banks'

export const dynamic = 'force-dynamic'

// Soft in-memory cache of the live bank list (per warm server instance). The
// list changes rarely, so a long TTL avoids hammering Paystack on every visit.
const CACHE_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours
let cache: { at: number; banks: { name: string; code: string }[] } | null = null

/**
 * GET /api/banks — returns the list of Nigerian banks for the payout dropdown.
 *
 * Response: { configured: boolean, banks: { name, code }[] }
 *   configured=true  -> live, Paystack-backed list; the client can auto-verify
 *                       account names via /api/banks/resolve.
 *   configured=false -> static fallback list; the client should let the user
 *                       type their account name manually (no live verification).
 *
 * Auth-gated (must be a signed-in user) and rate-limited.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(req, 'banks')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  if (!isPaystackConfigured()) {
    return NextResponse.json({ configured: false, banks: FALLBACK_NIGERIAN_BANKS })
  }

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ configured: true, banks: cache.banks })
  }

  try {
    const banks = await listBanks()
    if (banks.length === 0) {
      // Unexpected empty result — degrade to the static list rather than an
      // empty dropdown, and let the client fall back to manual name entry.
      return NextResponse.json({ configured: false, banks: FALLBACK_NIGERIAN_BANKS })
    }
    cache = { at: Date.now(), banks }
    return NextResponse.json({ configured: true, banks })
  } catch (e) {
    console.error('bank list fetch failed, using fallback', e)
    return NextResponse.json({ configured: false, banks: FALLBACK_NIGERIAN_BANKS })
  }
}
