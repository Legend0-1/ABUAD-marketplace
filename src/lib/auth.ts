import crypto from 'crypto'

// Simple hash (SHA-256 + per-process salt) — fine for sandbox demo.
// In production, use bcrypt/argon2.
export function hashPassword(password: string): string {
  const salt = process.env.AUTH_SALT || 'abuad-marketplace-salt-2024'
  return crypto
    .createHash('sha256')
    .update(salt + ':' + password)
    .digest('hex')
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

// Session token = base64(JSON{userId, exp}) + "." + HMAC-SHA256 signature.
// The signature is what actually protects this — without it, anyone could
// hand-craft a base64-encoded {"userId": "...", "exp": ...} payload and
// impersonate any account without ever knowing their password.
function getSessionSecret(): string {
  return process.env.AUTH_SALT || 'abuad-marketplace-salt-2024'
}

function signPayload(payloadB64: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(payloadB64).digest('hex')
}

export function createSessionToken(userId: string): string {
  const payload = {
    type: 'session',
    userId,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = signPayload(payloadB64)
  return `${payloadB64}.${signature}`
}

function parseSignedToken(token: string | undefined | null): any | null {
  if (!token) return null
  try {
    const [payloadB64, signature] = token.split('.')
    if (!payloadB64 || !signature) return null

    const expectedSignature = signPayload(payloadB64)
    // Constant-time comparison — prevents timing attacks from leaking the valid signature byte by byte.
    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSignature)
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null
    }

    const json = Buffer.from(payloadB64, 'base64').toString('utf-8')
    const payload = JSON.parse(json)
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export function parseSessionToken(token: string | undefined | null): { userId: string; exp: number } | null {
  const payload = parseSignedToken(token)
  if (!payload || payload.type !== 'session' || !payload.userId) return null
  return payload
}

// A short-lived (5 min), separately-typed token issued after password check
// but before 2FA verification. It can only ever be redeemed at the
// /api/auth/2fa/verify-login endpoint -- it is not accepted as a session
// token even if it leaked, because parseSessionToken checks payload.type.
export function createPendingTwoFactorToken(userId: string): string {
  const payload = { type: 'pending2fa', userId, exp: Date.now() + 1000 * 60 * 5 }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = signPayload(payloadB64)
  return `${payloadB64}.${signature}`
}

export function parsePendingTwoFactorToken(token: string | undefined | null): { userId: string } | null {
  const payload = parseSignedToken(token)
  if (!payload || payload.type !== 'pending2fa' || !payload.userId) return null
  return payload
}
