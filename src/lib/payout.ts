// Single source of truth for releasing a seller's payout from the platform's
// Paystack balance to their bank account.
//
// Why this exists: payouts used to be fired inline (buyer acknowledgment, admin
// dispute-release) with a naive `initiateTransfer(...)` call that assumed the
// transfer always goes straight through. In reality Paystack returns one of
// several statuses, and the common one for live accounts is "otp" — the account
// has "OTP for transfers" switched on, so the money does NOT move until the
// transfer is finalized with the one-time code Paystack sends the business
// owner. The old code treated "otp" as "processing" and moved on, so funds just
// sat in the platform balance with no way to release them. This module handles
// every status, is safe to retry, and never double-pays or double-counts sales.

import { db } from '@/lib/db'
import {
  resolveBankCode, createTransferRecipient, initiateTransfer, finalizeTransfer,
  verifyTransfer, type TransferStatus,
} from '@/lib/paystack'
import { checkAndCreateReferralCommission } from '@/lib/referral'

export type PayoutOutcome = {
  ok: boolean          // true when the money is sent OR legitimately on its way
  payoutStatus: string // the Order.payoutStatus we settled on
  needsOtp?: boolean   // true when an OTP is required to release the money
  message: string      // human-readable result for the admin / logs
}

type OrderWithStorefront = Awaited<ReturnType<typeof loadOrder>>

function loadOrder(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, include: { storefront: true } })
}

// Terminal "it went through" states.
function isSettledSuccess(status: TransferStatus) {
  return status === 'success'
}
// Accepted and still moving at the bank — money has left (or is leaving) our balance.
function isInFlight(status: TransferStatus) {
  return status === 'pending' || status === 'processing' || status === 'queued' || status === 'received'
}
function isFailure(status: TransferStatus) {
  return status === 'failed' || status === 'reversed' || status === 'abandoned'
}

/** Make sure the storefront has a Paystack transfer recipient, creating one from
 *  its saved bank details if needed. Returns the recipient code. */
async function ensureRecipientCode(storefront: NonNullable<OrderWithStorefront>['storefront']): Promise<string> {
  if (storefront.recipientCode) return storefront.recipientCode
  let bankCode = storefront.bankCode
  if (!bankCode) {
    bankCode = await resolveBankCode(storefront.bankName)
    if (!bankCode) throw new Error(`Could not resolve a bank code for "${storefront.bankName}". Ask the seller to re-check their bank name.`)
  }
  const recipient = await createTransferRecipient({
    accountName: storefront.accountName,
    accountNumber: storefront.accountNumber,
    bankCode,
  })
  await db.storefront.update({
    where: { id: storefront.id },
    data: { bankCode, recipientCode: recipient.recipient_code },
  })
  return recipient.recipient_code
}

/** Idempotently record that a payout fully succeeded: flip the order to
 *  completed/success and credit the seller's totalSales + referral commission
 *  EXACTLY once, even if called again by a webhook. The atomic updateMany guard
 *  (payoutStatus != 'success') guarantees only the first caller does the books. */
export async function markPayoutSuccess(order: { id: string; storefrontId: string; sellerPayout: number; buyerId: string }) {
  const flip = await db.order.updateMany({
    where: { id: order.id, payoutStatus: { not: 'success' } },
    data: { status: 'completed', payoutStatus: 'success', payoutAt: new Date(), payoutError: null },
  })
  if (flip.count === 1) {
    await db.storefront.update({
      where: { id: order.storefrontId },
      data: { totalSales: { increment: order.sellerPayout } },
    }).catch((e) => console.error('totalSales increment failed for order', order.id, e))
    await checkAndCreateReferralCommission(order.buyerId).catch((e) => console.error('referral commission failed for order', order.id, e))
  }
}

async function markInFlight(orderId: string, reference: string, transferCode: string | undefined) {
  await db.order.update({
    where: { id: orderId },
    data: {
      status: 'completed',
      payoutStatus: 'processing',
      ...(reference ? { transferReference: reference } : {}),
      ...(transferCode ? { transferCode } : {}),
      payoutAt: new Date(),
      payoutError: null,
    },
  })
}

async function markOtpPending(orderId: string, reference: string, transferCode: string | undefined) {
  await db.order.update({
    where: { id: orderId },
    data: {
      payoutStatus: 'otp_pending',
      ...(reference ? { transferReference: reference } : {}),
      ...(transferCode ? { transferCode } : {}),
      payoutError: null,
    },
  })
}

/** Translate a fresh transfer/finalize status into the right order state + outcome. */
async function applyStatus(
  order: NonNullable<OrderWithStorefront>,
  status: TransferStatus,
  reference: string,
  transferCode: string | undefined,
): Promise<PayoutOutcome> {
  if (isSettledSuccess(status)) {
    const patch: { transferReference?: string; transferCode?: string } = {}
    if (reference) patch.transferReference = reference
    if (transferCode) patch.transferCode = transferCode
    if (Object.keys(patch).length) await db.order.update({ where: { id: order.id }, data: patch })
    await markPayoutSuccess(order)
    return { ok: true, payoutStatus: 'success', message: `Payout of ₦${order.sellerPayout.toLocaleString()} sent to the seller's bank account.` }
  }
  if (status === 'otp') {
    await markOtpPending(order.id, reference, transferCode)
    return {
      ok: false,
      payoutStatus: 'otp_pending',
      needsOtp: true,
      message: 'Paystack needs the OTP it just sent to your registered phone/email to release this payout. Enter it to finish, or disable Transfer OTP in your Paystack settings for automatic payouts.',
    }
  }
  if (isInFlight(status)) {
    await markInFlight(order.id, reference, transferCode)
    return { ok: true, payoutStatus: 'processing', message: 'Payout accepted — the bank is processing it. It will confirm shortly.' }
  }
  // failed / reversed / abandoned
  await db.order.update({ where: { id: order.id }, data: { payoutStatus: 'failed', payoutError: `Transfer ${status}.` } })
  return { ok: false, payoutStatus: 'failed', message: `The transfer came back "${status}". You can retry it.` }
}

/**
 * Release (or retry, or finalize) the payout for one order.
 *
 * - Pass `{ otp }` to finalize a transfer that is waiting on an OTP.
 * - Otherwise it reconciles any existing transfer first (so a retry never
 *   double-sends), and only initiates a brand-new transfer if there isn't one
 *   already in flight. Each new attempt uses a unique reference, so retries
 *   never collide with Paystack's "reference has been used before" rule.
 *
 * Safe to call repeatedly. Returns a PayoutOutcome describing what happened.
 */
export async function releaseOrderPayout(orderId: string, opts: { otp?: string } = {}): Promise<PayoutOutcome> {
  const order = await loadOrder(orderId)
  if (!order) return { ok: false, payoutStatus: 'failed', message: 'Order not found.' }
  if (order.payoutStatus === 'success') {
    return { ok: true, payoutStatus: 'success', message: 'This payout has already been completed.' }
  }
  if (!order.acknowledged) {
    return { ok: false, payoutStatus: order.payoutStatus, message: 'The buyer has not acknowledged receipt yet, so no payout is due.' }
  }
  if (!order.sellerPayout || order.sellerPayout <= 0) {
    return { ok: false, payoutStatus: order.payoutStatus, message: 'This order has no payout amount.' }
  }

  // (1) Finalizing an OTP transfer the admin just received the code for.
  if (opts.otp) {
    if (!order.transferCode) {
      return { ok: false, payoutStatus: order.payoutStatus, message: 'There is no transfer awaiting an OTP for this order. Try "Retry payout" instead.' }
    }
    try {
      const fin = await finalizeTransfer({ transferCode: order.transferCode, otp: opts.otp.trim() })
      return await applyStatus(order, fin.status, order.transferReference || '', order.transferCode)
    } catch (e: any) {
      const msg = e?.message || 'OTP verification failed.'
      await db.order.update({ where: { id: orderId }, data: { payoutStatus: 'otp_pending', payoutError: msg } })
      return { ok: false, payoutStatus: 'otp_pending', needsOtp: true, message: `${msg} Double-check the code and try again.` }
    }
  }

  // (2) Reconcile an existing transfer before creating a new one, so a retry
  //     never fires a duplicate payout for a transfer that actually went
  //     through (or is still pending / waiting on OTP).
  if (order.transferReference) {
    try {
      const existing = await verifyTransfer(order.transferReference)
      if (isSettledSuccess(existing.status)) {
        await markPayoutSuccess(order)
        return { ok: true, payoutStatus: 'success', message: 'This payout had already gone through — status reconciled to success.' }
      }
      if (existing.status === 'otp') {
        await markOtpPending(order.id, order.transferReference, existing.transfer_code || order.transferCode || undefined)
        return { ok: false, payoutStatus: 'otp_pending', needsOtp: true, message: 'This transfer is waiting on an OTP. Enter the code Paystack sent you to release it.' }
      }
      if (isInFlight(existing.status)) {
        await markInFlight(order.id, order.transferReference, existing.transfer_code || order.transferCode || undefined)
        return { ok: true, payoutStatus: 'processing', message: 'This payout is still processing at the bank.' }
      }
      // failed / reversed / abandoned -> fall through and start a fresh transfer
    } catch {
      // Couldn't verify (e.g. the reference never created a transfer). Fall
      // through and attempt a fresh transfer below.
    }
  }

  // (3) No usable existing transfer — initiate a brand-new one with a unique ref.
  try {
    const recipientCode = await ensureRecipientCode(order.storefront)
    const reference = `PAYOUT-${order.reference}-${Date.now().toString(36).toUpperCase()}`
    const transfer = await initiateTransfer({
      amountNaira: order.sellerPayout,
      recipientCode,
      reference,
      reason: `Payout for order ${order.reference}`,
    })
    return await applyStatus(order, transfer.status, reference, transfer.transfer_code)
  } catch (e: any) {
    const msg = e?.message || 'Payout failed.'
    await db.order.update({ where: { id: orderId }, data: { payoutStatus: 'failed', payoutError: msg } })
    return { ok: false, payoutStatus: 'failed', message: msg }
  }
}

/**
 * Reconcile a payout from a Paystack transfer.* webhook. We never trust the
 * webhook body — we re-verify with Paystack by reference, then update the order.
 */
export async function reconcilePayoutByReference(reference: string): Promise<void> {
  if (!reference) return
  const order = await db.order.findFirst({ where: { transferReference: reference } })
  if (!order) return

  let status: TransferStatus
  try {
    const v = await verifyTransfer(reference)
    status = v.status
  } catch (e) {
    console.error('transfer webhook verify failed for', reference, e)
    return
  }

  if (isSettledSuccess(status)) {
    await markPayoutSuccess(order)
  } else if (isFailure(status)) {
    await db.order.update({
      where: { id: order.id },
      data: { payoutStatus: 'failed', payoutError: `Transfer ${status} (per Paystack).` },
    })
  } else if (status === 'otp') {
    await db.order.update({ where: { id: order.id }, data: { payoutStatus: 'otp_pending' } })
  } else {
    await db.order.update({ where: { id: order.id }, data: { payoutStatus: 'processing' } })
  }
}
