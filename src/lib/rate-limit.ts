import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = getRedis()

// Separate limiters per endpoint, since they carry different risk levels.
// Login/password-reset are the most sensitive (credential-guessing surface),
// registration is more lenient (real students registering in a rush at
// launch shouldn't get blocked), matching a normal traffic pattern.
const limiters = redis ? {
  login: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(8, '15 m'), prefix: 'rl:login' }),
  register: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(15, '1 h'), prefix: 'rl:register' }),
  forgotPassword: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(4, '1 h'), prefix: 'rl:forgot-password' }),
  resendVerification: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(4, '1 h'), prefix: 'rl:resend-verification' }),
} : null

export type RateLimitKey = keyof NonNullable<typeof limiters>

/**
 * Checks whether this request should be allowed. If Upstash isn't
 * configured, always allows the request through -- rate limiting is
 * optional hardening, not a hard dependency, same pattern as email/SMS.
 */
export async function checkRateLimit(req: NextRequest, key: RateLimitKey): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  if (!limiters) return { allowed: true }

  // Best-effort real client IP behind Vercel's proxy.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'

  try {
    const result = await limiters[key].limit(ip)
    if (result.success) return { allowed: true }
    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    return { allowed: false, retryAfterSeconds }
  } catch (e) {
    // If Upstash itself errors, fail open rather than locking everyone out
    // of login because a third-party service hiccuped.
    console.error('rate limit check failed, allowing request', e)
    return { allowed: true }
  }
}
