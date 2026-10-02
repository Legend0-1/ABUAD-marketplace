import { NextResponse } from 'next/server'
import { getEnabledCountryCodes } from '@/lib/settings'
import { getEnabledCountries } from '@/lib/institutions'

export const dynamic = 'force-dynamic'

/**
 * Public endpoint: which countries are currently available at registration.
 * Used by the sign-up form (pre-auth) to populate the Country dropdown. Returns
 * only countries the admin has enabled AND that exist in the catalog. The client
 * already bundles the institution catalog (src/lib/institutions.ts), so only the
 * country list needs to come from the server.
 */
export async function GET() {
  const codes = await getEnabledCountryCodes()
  const countries = getEnabledCountries(codes)
  return NextResponse.json({ countries })
}
