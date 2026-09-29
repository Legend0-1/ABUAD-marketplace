import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limit'
import { isPaystackConfigured, resolveAccountNumber, resolveBankCode } from '@/lib/paystack'

export const dynamic = 'force-dynamic'

/**
 * POST /api/banks/resolve — confirms an account holder's name, like the name
 * preview you see during a mobile bank transfer.
 *
 * Body: { accountNumber: string(10 digits), bankCode?: string, bankName?: string }
 * Response:
 *   { configured: true, accountName: string }   on success
 *   { configured: false }                        when Paystack isn't set up
 *                                                (client should accept a typed name)
 *   { error }                                    on invalid input / unresolvable account
 *
 * Auth-gated and rate-limited so it can't be abused as an account-name lookup oracle.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await checkRateLimit(req, 'resolveAccount')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a moment and try again.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const accountNumber = String(body?.accountNumber ?? '').trim()
  const bankCode = String(body?.bankCode ?? '').trim()
  const bankName = String(body?.bankName ?? '').trim()

  if (!/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: 'Enter a valid 10-digit account number.' }, { status: 400 })
  }

  // Without a Paystack key we can't verify — tell the client to fall back to a
  // manually typed account name instead of blocking the flow.
  if (!isPaystackConfigured()) {
    return NextResponse.json({ configured: false })
  }

  try {
    const code = bankCode || (bankName ? await resolveBankCode(bankName) : null)
    if (!code) {
      return NextResponse.json({ error: 'Select your bank first.' }, { status: 400 })
    }
    const result = await resolveAccountNumber({ accountNumber, bankCode: code })
    if (!result.accountName) {
      return NextResponse.json(
        { error: "We couldn't verify that account. Check the number and bank, then try again." },
        { status: 422 }
      )
    }
    return NextResponse.json({ configured: true, accountName: result.accountName })
  } catch (e) {
    console.error('account resolve failed', e)
    return NextResponse.json(
      { error: "We couldn't verify that account. Check the number and bank, then try again." },
      { status: 422 }
    )
  }
}
