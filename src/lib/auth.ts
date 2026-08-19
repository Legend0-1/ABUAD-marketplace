import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// Passwords are hashed with bcrypt (cost factor 12). verifyPassword still
// accepts the old SHA-256+salt format for any account that hasn't logged in
// since this change shipped -- those get silently upgraded to bcrypt on
// their next successful login (see needsRehash below), rather than forcing
// every existing user to reset their password.
function legacyHashPassword(password: string): string {
  const salt = process.env.AUTH_SALT || 'abuad-marketplace-salt-2024'
  return crypto
    .createHash('sha256')
    .update(salt + ':' + password)
    .digest('hex')
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12)
}

function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$/.test(hash)
}

export function verifyPassword(password: string, hash: string): boolean {
  if (isBcryptHash(hash)) {
    return bcrypt.compareSync(password, hash)
  }
  // Legacy SHA-256 hash -- compare using the old method.
  return legacyHashPassword(password) === hash
}

/** True if this hash is still the old SHA-256 format and should be upgraded on next successful login. */
export function needsRehash(hash: string): boolean {
  return !isBcryptHash(hash)
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

// Email verification token -- 48 hours, tied to the specific email address at
// send time. If the user later changes their email, an old verification link
// won't silently verify the new address, since the email is part of the
// signed payload and checked on redemption.
export function createEmailVerificationToken(userId: string, email: string): string {
  const payload = { type: 'email_verify', userId, email, exp: Date.now() + 1000 * 60 * 60 * 48 }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = signPayload(payloadB64)
  return `${payloadB64}.${signature}`
}

export function parseEmailVerificationToken(token: string | undefined | null): { userId: string; email: string } | null {
  const payload = parseSignedToken(token)
  if (!payload || payload.type !== 'email_verify' || !payload.userId || !payload.email) return null
  return payload
}

// Password reset token -- deliberately short-lived (30 min), since this one
// grants the ability to set a brand new password outright. Bound to a
// fingerprint of the current password hash so it's naturally single-use:
// once the password changes, the fingerprint no longer matches, so a reused
// (but still time-valid) token is rejected without needing a database table
// to track which tokens have already been redeemed.
function passwordFingerprint(passwordHash: string): string {
  return crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16)
}

export function createPasswordResetToken(userId: string, currentPasswordHash: string): string {
  const payload = { type: 'password_reset', userId, pwFingerprint: passwordFingerprint(currentPasswordHash), exp: Date.now() + 1000 * 60 * 30 }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  const signature = signPayload(payloadB64)
  return `${payloadB64}.${signature}`
}

/** Step 1: decode a password-reset token enough to know which user it's for, without yet checking single-use. */
export function peekPasswordResetToken(token: string | undefined | null): { userId: string; pwFingerprint: string } | null {
  const payload = parseSignedToken(token)
  if (!payload || payload.type !== 'password_reset' || !payload.userId || !payload.pwFingerprint) return null
  return payload
}

/** Step 2: once you have the user's current password hash, confirm this token hasn't already been used. */
export function verifyPasswordResetFingerprint(pwFingerprint: string, currentPasswordHash: string): boolean {
  return pwFingerprint === passwordFingerprint(currentPasswordHash)
}
