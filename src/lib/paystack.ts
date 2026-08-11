// Thin wrapper around the Paystack REST API.
//
// Flow used by this app:
// 1. Buyer checks out -> we call initializeTransaction() -> buyer is redirected to
//    Paystack's hosted page (card, bank transfer, USSD, etc.) and pays into OUR
//    Paystack settlement account. The buyer never sees or needs the seller's bank details.
// 2. Paystack calls our webhook when payment succeeds -> we verify it server-side
//    (never trust the webhook body alone) and mark the order "paid".
// 3. When the buyer acknowledges receipt, we transfer the seller's payout (total
//    minus service charge) from our Paystack balance to the seller's bank account
//    using the Transfers API.
//
// Docs: https://paystack.com/docs/payments/accept-payments/
//       https://paystack.com/docs/transfers/single-transfers/

import crypto from 'crypto'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set')
  return key
}

async function paystackFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok || data.status === false) {
    throw new Error(data.message || `Paystack request failed: ${path}`)
  }
  return data
}

// --- Collections (buyer -> platform) ---

export async function initializeTransaction(params: {
  email: string
  amountNaira: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, any>
}) {
  const data = await paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNaira * 100), // kobo
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata || {},
    }),
  })
  return data.data as { authorization_url: string; access_code: string; reference: string }
}

export async function verifyTransaction(reference: string) {
  const data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`)
  return data.data as { status: string; amount: number; reference: string; paid_at: string | null }
}

// --- Payouts (platform -> seller) ---

export async function resolveBankCode(bankName: string): Promise<string | null> {
  const data = await paystackFetch('/bank?country=nigeria&currency=NGN')
  const banks = data.data as { name: string; code: string }[]
  const match = banks.find(
    (b) => b.name.toLowerCase() === bankName.toLowerCase() || b.name.toLowerCase().includes(bankName.toLowerCase())
  )
  return match?.code ?? null
}

export async function createTransferRecipient(params: {
  accountName: string
  accountNumber: string
  bankCode: string
}) {
  const data = await paystackFetch('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: params.accountName,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: 'NGN',
    }),
  })
  return data.data as { recipient_code: string }
}

export async function initiateTransfer(params: {
  amountNaira: number
  recipientCode: string
  reference: string
  reason: string
}) {
  const data = await paystackFetch('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(params.amountNaira * 100), // kobo
      recipient: params.recipientCode,
      reference: params.reference,
      reason: params.reason,
    }),
  })
  return data.data as { transfer_code: string; status: string }
}

// --- Webhook signature verification ---
// Paystack signs the raw request body with your secret key (HMAC SHA512).
// Always verify this before trusting a webhook payload.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false
  const hash = crypto.createHmac('sha512', getSecretKey()).update(rawBody).digest('hex')
  return hash === signatureHeader
}
