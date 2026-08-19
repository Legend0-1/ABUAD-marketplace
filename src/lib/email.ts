import { Resend } from 'resend'

// Email is optional infrastructure: if RESEND_API_KEY isn't set, every send
// silently no-ops (logged, not thrown) so the app keeps working exactly as
// before for anyone who hasn't set this up yet -- the same pattern used for
// the optional realtime chat service.
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'UNI MART <onboarding@resend.dev>'

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const client = getResendClient()
  if (!client) {
    console.log(`[email] RESEND_API_KEY not set — skipping email to ${params.to}: "${params.subject}"`)
    return { skipped: true }
  }
  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
    return result
  } catch (e) {
    // Email failures should never break the flow that triggered them (an
    // order still gets created even if the notification email fails).
    console.error('email send failed', e)
    return { error: e }
  }
}

function emailShell(bodyHtml: string, ctaLabel?: string, ctaUrl?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1B2A2C;">
    <div style="background: #153B3D; padding: 16px 20px; border-radius: 8px 8px 0 0;">
      <span style="color: #E2A63B; font-weight: 700; font-size: 18px;">UNI MART</span>
    </div>
    <div style="background: #ffffff; border: 1px solid #E4DFD1; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
      ${bodyHtml}
      ${ctaLabel && ctaUrl ? `
      <div style="margin-top: 20px;">
        <a href="${ctaUrl}" style="background: #E2A63B; color: #153B3D; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">${ctaLabel}</a>
      </div>` : ''}
    </div>
    <p style="font-size: 11px; color: #888; margin-top: 16px;">
      UNI MART — Afe Babalola University's student marketplace.${appUrl ? ` <a href="${appUrl}" style="color: #888;">${appUrl}</a>` : ''}
    </p>
  </div>`
}

export async function sendNewOrderEmail(params: {
  sellerEmail: string
  sellerName: string
  buyerName: string
  productTitle: string
  quantity: number
  totalAmount: number
  reference: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return sendEmail({
    to: params.sellerEmail,
    subject: `New order: ${params.productTitle}`,
    html: emailShell(
      `<h2 style="margin-top:0;">You've got a new order 🎉</h2>
       <p>Hi ${params.sellerName},</p>
       <p><strong>${params.buyerName}</strong> just ordered <strong>${params.quantity} × ${params.productTitle}</strong> for a total of <strong>₦${params.totalAmount.toLocaleString()}</strong>.</p>
       <p style="color:#666; font-size: 13px;">Order reference: ${params.reference}</p>
       <p>Payment is held securely by UNI MART until the buyer confirms receipt — check your Orders page for the next steps.</p>`,
      'View Order',
      `${appUrl}/?view=orders`
    ),
  })
}

export async function sendVerificationEmail(params: { email: string; fullName: string; token: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return sendEmail({
    to: params.email,
    subject: 'Verify your UNI MART email',
    html: emailShell(
      `<h2 style="margin-top:0;">Confirm your email</h2>
       <p>Hi ${params.fullName},</p>
       <p>Welcome to UNI MART! Click below to verify this email address — this link expires in 48 hours.</p>
       <p style="color:#666; font-size: 13px;">If you didn't create this account, you can safely ignore this email.</p>`,
      'Verify Email',
      `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(params.token)}`
    ),
  })
}

export async function sendPasswordResetEmail(params: { email: string; fullName: string; token: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return sendEmail({
    to: params.email,
    subject: 'Reset your UNI MART password',
    html: emailShell(
      `<h2 style="margin-top:0;">Reset your password</h2>
       <p>Hi ${params.fullName},</p>
       <p>We received a request to reset your password. Click below to choose a new one — this link expires in 30 minutes.</p>
       <p style="color:#666; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't change unless you click the link above and set a new one.</p>`,
      'Reset Password',
      `${appUrl}/?view=reset-password&token=${encodeURIComponent(params.token)}`
    ),
  })
}
