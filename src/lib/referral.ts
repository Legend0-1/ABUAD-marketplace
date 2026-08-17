import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — avoids ambiguous codes

export function randomCodeSuffix(length = 6): string {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return out
}

/** Generates a unique referral code, retrying on the rare collision. */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `UM-${randomCodeSuffix()}`
    const existing = await db.user.findUnique({ where: { referralCode: code } })
    if (!existing) return code
  }
  // Astronomically unlikely, but fall back to a longer code rather than looping forever.
  return `UM-${randomCodeSuffix(10)}`
}

/** Backfills referral codes for any existing users who don't have one yet (pre-referral-program accounts). */
export async function backfillReferralCodes() {
  const usersWithoutCode = await db.user.findMany({ where: { referralCode: null }, select: { id: true } })
  for (const u of usersWithoutCode) {
    const code = await generateUniqueReferralCode()
    await db.user.update({ where: { id: u.id }, data: { referralCode: code } })
  }
}

const QUALIFYING_BATCH_SIZE = 5
const COMMISSION_RATE = 0.05

/**
 * Called whenever an order reaches the "qualifying" state (completed --
 * buyer acknowledged, seller paid out). Checks whether the buyer's referrer
 * has just accumulated a new complete batch of 5 qualifying orders from this
 * buyer, and if so, creates a pending commission (5% of the batch's combined
 * total). Never throws -- a commission-calculation failure should never
 * block the order flow that triggered it.
 */
export async function checkAndCreateReferralCommission(buyerId: string) {
  try {
    const buyer = await db.user.findUnique({ where: { id: buyerId }, select: { id: true, referredById: true, fullName: true } })
    if (!buyer?.referredById) return // not a referred user, nothing to do

    // All of this buyer's completed orders, oldest first, so batches are
    // stable and reproducible (always groups the same 5 orders together).
    const completedOrders = await db.order.findMany({
      where: { buyerId, status: 'completed' },
      orderBy: { acknowledgedAt: 'asc' },
      select: { id: true, totalAmount: true },
    })

    // How many of those orders are already accounted for in a previous batch?
    const priorBatches = await db.referralCommission.findMany({
      where: { referredUserId: buyerId },
      select: { qualifyingOrderIds: true },
    })
    const alreadyBatched = new Set<string>()
    for (const b of priorBatches) {
      for (const orderId of JSON.parse(b.qualifyingOrderIds) as string[]) alreadyBatched.add(orderId)
    }

    const unbatched = completedOrders.filter((o) => !alreadyBatched.has(o.id))
    if (unbatched.length < QUALIFYING_BATCH_SIZE) return // not enough for a new batch yet

    const batch = unbatched.slice(0, QUALIFYING_BATCH_SIZE)
    const batchTotal = batch.reduce((sum, o) => sum + o.totalAmount, 0)
    const commissionAmount = Math.round(batchTotal * COMMISSION_RATE * 100) / 100

    await db.referralCommission.create({
      data: {
        referrerId: buyer.referredById,
        referredUserId: buyerId,
        qualifyingOrderIds: JSON.stringify(batch.map((o) => o.id)),
        batchTotal,
        commissionAmount,
        status: 'pending',
      },
    })

    await logAudit({
      actor: null,
      action: 'referral.commission_created',
      targetType: 'User',
      targetId: buyer.referredById,
      detail: `₦${commissionAmount.toLocaleString()} owed for ${buyer.fullName}'s purchases (batch of ${QUALIFYING_BATCH_SIZE})`,
    })

    // Notify the referrer via the existing admin_direct-style inbox mechanism
    // isn't quite right here (this isn't from admin) -- keep it simple: the
    // referrer sees it on their Profile page's earnings summary. Admin also
    // sees it immediately in the Referrals dashboard (that's the "alert").
  } catch (e) {
    console.error('referral commission check failed', e)
  }
}
