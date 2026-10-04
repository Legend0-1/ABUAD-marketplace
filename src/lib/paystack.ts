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

/** True when a Paystack secret key is available, so callers can degrade
 *  gracefully (e.g. skip live bank/account verification) instead of throwing. */
export function isPaystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY
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

/** Refunds a buyer's payment in full (or partially, if amountNaira is given). */
export async function refundTransaction(params: { reference: string; amountNaira?: number }) {
  const data = await paystackFetch('/refund', {
    method: 'POST',
    body: JSON.stringify({
      transaction: params.reference,
      ...(params.amountNaira ? { amount: Math.round(params.amountNaira * 100) } : {}),
    }),
  })
  return data.data as { status: string; refund_reference: string }
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

/** Live list of Nigerian banks Paystack can pay out to, for the bank dropdown.
 *  Sorted alphabetically; de-duplicated by (name, code). */
export async function listBanks(): Promise<{ name: string; code: string }[]> {
  const data = await paystackFetch('/bank?country=nigeria&currency=NGN')
  const raw = (data.data as { name: string; code: string }[]) || []
  const seen = new Set<string>()
  const banks: { name: string; code: string }[] = []
  for (const b of raw) {
    if (!b?.name || !b?.code) continue
    const key = `${b.name}|${b.code}`
    if (seen.has(key)) continue
    seen.add(key)
    banks.push({ name: b.name, code: b.code })
  }
  banks.sort((a, b) => a.name.localeCompare(b.name))
  return banks
}

/** Ask Paystack for the account holder's name for a given account number + bank
 *  code. This is what lets a user confirm they own the account (like the name
 *  preview during a mobile bank transfer). Throws if the account can't be
 *  resolved (wrong number/bank, or Paystack error). */
export async function resolveAccountNumber(params: {
  accountNumber: string
  bankCode: string
}): Promise<{ accountNumber: string; accountName: string }> {
  const data = await paystackFetch(
    `/bank/resolve?account_number=${encodeURIComponent(params.accountNumber)}&bank_code=${encodeURIComponent(params.bankCode)}`
  )
  return {
    accountNumber: String(data.data?.account_number ?? params.accountNumber),
    accountName: String(data.data?.account_name ?? ''),
  }
}

/** Best-effort server-side verification used when saving bank details. Returns
 *  the bank-verified account name + resolved bank code, or null if it can't be
 *  verified (Paystack not configured, unknown bank, bad number, network error).
 *  Never throws — callers fall back to the client-supplied name so a transient
 *  Paystack hiccup never blocks storefront/partner setup. */
export async function tryVerifyAccount(params: {
  bankName: string
  bankCode?: string | null
  accountNumber: string
}): Promise<{ accountName: string; bankCode: string } | null> {
  if (!isPaystackConfigured()) return null
  if (!/^\d{10}$/.test(params.accountNumber)) return null
  try {
    const code = params.bankCode || (await resolveBankCode(params.bankName))
    if (!code) return null
    const res = await resolveAccountNumber({ accountNumber: params.accountNumber, bankCode: code })
    if (!res.accountName) return null
    return { accountName: res.accountName, bankCode: code }
  } catch {
    return null
  }
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

// Possible Paystack transfer statuses:
//   "success"   -> money has left our balance and reached (or is reaching) the seller
//   "pending" / "processing" / "queued" / "received" -> accepted, settling at the bank
//   "otp"       -> account has Transfer OTP enabled; MUST be finalized with the OTP
//                  Paystack just sent to the business owner (finalizeTransfer below)
//   "failed" / "reversed" / "abandoned" -> did not go through
export type TransferStatus =
  | 'success' | 'pending' | 'processing' | 'queued' | 'received'
  | 'otp' | 'failed' | 'reversed' | 'abandoned' | string

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
  return data.data as { transfer_code: string; status: TransferStatus; reference: string; id: number }
}

/** Completes a transfer that came back with status "otp". The business owner
 *  receives the OTP from Paystack (SMS/email) the moment initiateTransfer runs;
 *  passing it here actually releases the money. If you'd rather not do this on
 *  every payout, disable "OTP for transfers" in Paystack Dashboard ->
 *  Settings -> Preferences, and transfers will go straight through. */
export async function finalizeTransfer(params: { transferCode: string; otp: string }) {
  const data = await paystackFetch('/transfer/finalize_transfer', {
    method: 'POST',
    body: JSON.stringify({ transfer_code: params.transferCode, otp: params.otp }),
  })
  return data.data as { transfer_code: string; status: TransferStatus; reference?: string }
}

/** Server-side source of truth for a transfer's current state, looked up by the
 *  reference we assigned. Used to reconcile webhooks and to check an existing
 *  transfer before retrying (so we never fire a duplicate payout). */
export async function verifyTransfer(reference: string) {
  const data = await paystackFetch(`/transfer/verify/${encodeURIComponent(reference)}`)
  return data.data as { status: TransferStatus; transfer_code?: string; reference: string; reason?: string }
}

/** Available balance(s) on the platform's Paystack account, in naira. Only
 *  *settled* funds show here — money from very recent payments may still be in
 *  pending settlement (T+1 in Nigeria) and cannot be transferred out yet. */
export async function getBalance(): Promise<{ currency: string; balance: number }[]> {
  const data = await paystackFetch('/balance')
  const rows = (data.data as { currency: string; balance: number }[]) || []
  return rows.map((b) => ({ currency: b.currency, balance: (b.balance || 0) / 100 }))
}

// --- Webhook signature verification ---
// Paystack signs the raw request body with your secret key (HMAC SHA512).
// Always verify this before trusting a webhook payload.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false
  const hash = crypto.createHmac('sha512', getSecretKey()).update(rawBody).digest('hex')
  return hash === signatureHeader
}
