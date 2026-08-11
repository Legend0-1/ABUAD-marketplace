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

// Session token = base64(JSON{userId, exp})
export function createSessionToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export function parseSessionToken(token: string | undefined | null): { userId: string; exp: number } | null {
  if (!token) return null
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8')
    const payload = JSON.parse(json)
    if (!payload.userId || !payload.exp) return null
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
