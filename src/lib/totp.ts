import crypto from 'crypto'

// Standard base32 alphabet (RFC 4648) used by every authenticator app (Google
// Authenticator, Authy, etc.)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret(): string {
  const bytes = crypto.randomBytes(20)
  let bits = ''
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0')
  let secret = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)]
  }
  return secret
}

function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return (code % 1_000_000).toString().padStart(6, '0')
}

/** Verifies a 6-digit code, allowing +/-1 time step (30s) for clock drift. */
export function verifyTotp(secret: string, token: string): boolean {
  const clean = (token || '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  const counter = Math.floor(Date.now() / 1000 / 30)
  for (let drift = -1; drift <= 1; drift++) {
    if (hotp(secret, counter + drift) === clean) return true
  }
  return false
}

export function totpAuthUri(secret: string, email: string): string {
  const issuer = encodeURIComponent('UNI MART')
  const label = encodeURIComponent(`UNI MART:${email}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
}
