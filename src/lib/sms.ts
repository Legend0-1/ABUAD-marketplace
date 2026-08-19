// SMS via Termii (https://termii.com) — a Nigerian SMS/messaging provider,
// no Meta Business verification needed unlike WhatsApp Business API.
//
// Same optional-infrastructure pattern as lib/email.ts: if TERMII_API_KEY
// isn't set, every send silently no-ops (logged, not thrown).

const TERMII_BASE_URL = 'https://api.ng.termii.com/api'

function getTermiiConfig(): { apiKey: string; senderId: string } | null {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID
  if (!apiKey || !senderId) return null
  return { apiKey, senderId }
}

/**
 * Normalizes a Nigerian phone number to the digits-only, country-code-prefixed
 * format Termii expects (e.g. "08012345678" -> "2348012345678").
 * Returns null if the input doesn't look like a valid Nigerian number.
 */
export function normalizeNigerianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234') && digits.length === 13) return digits
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1)
  if (digits.length === 10) return '234' + digits // e.g. "8012345678" without leading 0
  return null
}

export async function sendSms(params: { to: string; message: string }) {
  const config = getTermiiConfig()
  if (!config) {
    console.log(`[sms] TERMII_API_KEY/TERMII_SENDER_ID not set — skipping SMS to ${params.to}`)
    return { skipped: true }
  }

  const to = normalizeNigerianPhone(params.to)
  if (!to) {
    console.error(`[sms] "${params.to}" doesn't look like a valid Nigerian phone number — skipping`)
    return { skipped: true, reason: 'invalid_phone' }
  }

  try {
    const res = await fetch(`${TERMII_BASE_URL}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.apiKey,
        to,
        from: config.senderId,
        sms: params.message,
        type: 'plain',
        // "dnd" (transactional) route, not "generic" (promotional-only) --
        // Termii's own docs warn the generic route can fail to deliver
        // transactional messages like order alerts.
        channel: 'dnd',
      }),
    })
    const data = await res.json()
    if (data.code !== 'ok') {
      console.error('[sms] Termii send failed', data)
      return { error: data }
    }
    return data
  } catch (e) {
    // SMS failures should never break the flow that triggered them.
    console.error('sms send failed', e)
    return { error: e }
  }
}

export async function sendNewOrderSms(params: {
  sellerPhone: string
  buyerName: string
  productTitle: string
  totalAmount: number
}) {
  const message = `UNI MART: New order from ${params.buyerName} for "${params.productTitle}" (₦${params.totalAmount.toLocaleString()}). Check your Orders page to confirm.`
  return sendSms({ to: params.sellerPhone, message })
}
