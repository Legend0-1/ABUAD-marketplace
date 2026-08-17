import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { generateTotpSecret, totpAuthUri } from '@/lib/totp'
import QRCode from 'qrcode'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = generateTotpSecret()
  const uri = totpAuthUri(secret, user.email)
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 })

  // Not saved to the user yet -- only persisted once they confirm with a
  // correct code via /api/auth/2fa/enable, so an abandoned setup never
  // half-enables 2FA on the account.
  return NextResponse.json({ secret, qrDataUrl })
}
