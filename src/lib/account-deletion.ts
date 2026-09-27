import { db } from '@/lib/db'

// Irreversible, DB-level deletion of accounts and storefronts.
//
// The schema only cascades SOME relations when a User is removed (Storefront,
// Product, ProductMedia, AgreementSignature, Feedback cascade; AuditLog nulls
// its actor). Everything else — Order, Review, Comment, Report, Message,
// Conversation, the delivery tables, and ReferralCommission — uses the default
// "restrict" behaviour, so a bare `db.user.delete()` throws a foreign-key
// error. These helpers delete the restricted rows in a FK-safe order inside a
// single transaction, then delete the parent so the remaining cascades fire.
// This needs NO schema migration.
//
// Before deleting we refuse when money is in motion, so an admin can never
// accidentally destroy live escrow, an in-flight payout, or the counterparty's
// record of a transaction that hasn't settled yet.

// Order states where funds are collected/held/in-dispute (money is in motion).
// "pending" (never paid) and the settled end-states "completed"/"refunded" are
// safe to remove.
export const BLOCKING_ORDER_STATUSES = ['paid', 'in_transit', 'delivered', 'acknowledged', 'disputed'] as const

// Delivery job states where a customer has paid and the job isn't settled.
// "pending_payment" (unpaid) and "completed"/"cancelled" are safe.
export const BLOCKING_DELIVERY_STATUSES = ['pending_hr', 'awaiting_partner', 'in_progress', 'disputed'] as const

const IN_MOTION_ORDER_OR = [
  { status: { in: [...BLOCKING_ORDER_STATUSES] } },
  { payoutStatus: 'processing' },
  { AND: [{ refundRequested: true }, { refundedAt: null }] },
]

/**
 * Returns a list of human-readable reasons this account can't be safely
 * hard-deleted yet. Empty array means it's safe to delete.
 */
export async function getUserDeletionBlockers(userId: string): Promise<string[]> {
  const blockers: string[] = []

  const liveOrders = await db.order.count({
    where: {
      AND: [
        { OR: [{ buyerId: userId }, { sellerId: userId }] },
        { OR: IN_MOTION_ORDER_OR },
      ],
    },
  })
  if (liveOrders > 0) {
    blockers.push(
      `${liveOrders} order${liveOrders === 1 ? '' : 's'} with money in motion (paid, in transit, delivered, disputed, or a payout/refund still processing)`
    )
  }

  const liveDeliveriesAsCustomer = await db.deliveryRequest.count({
    where: { customerId: userId, status: { in: [...BLOCKING_DELIVERY_STATUSES] } },
  })
  const partnerProfile = await db.deliveryPartnerProfile.findUnique({ where: { userId }, select: { id: true } })
  let liveDeliveriesAsPartner = 0
  if (partnerProfile) {
    liveDeliveriesAsPartner = await db.deliveryRequest.count({
      where: { partnerId: partnerProfile.id, status: { in: [...BLOCKING_DELIVERY_STATUSES] } },
    })
  }
  const liveDeliveries = liveDeliveriesAsCustomer + liveDeliveriesAsPartner
  if (liveDeliveries > 0) {
    blockers.push(`${liveDeliveries} delivery job${liveDeliveries === 1 ? '' : 's'} still in progress`)
  }

  const owedCommissions = await db.referralCommission.count({
    where: { referrerId: userId, status: 'pending' },
  })
  if (owedCommissions > 0) {
    blockers.push(
      `${owedCommissions} unpaid referral commission${owedCommissions === 1 ? '' : 's'} owed to this account (pay or cancel them first)`
    )
  }

  return blockers
}

/**
 * Permanently removes a user and everything tied to them, in FK-safe order,
 * inside one transaction. Caller MUST check getUserDeletionBlockers first.
 */
export async function hardDeleteUser(userId: string): Promise<void> {
  await db.$transaction(
    async (tx) => {
      // Keep the accounts this user referred — just detach the pointer.
      await tx.user.updateMany({ where: { referredById: userId }, data: { referredById: null } })

      // Referral commissions on either side of this user.
      await tx.referralCommission.deleteMany({
        where: { OR: [{ referrerId: userId }, { referredUserId: userId }] },
      })

      // Reports filed by or against this user.
      await tx.report.deleteMany({
        where: { OR: [{ reporterId: userId }, { reportedUserId: userId }] },
      })

      // --- Delivery system (messages -> requests -> partner profile) ---
      const partnerProfile = await tx.deliveryPartnerProfile.findUnique({
        where: { userId },
        select: { id: true },
      })
      // Messages this user sent, anywhere.
      await tx.deliveryMessage.deleteMany({ where: { senderId: userId } })
      // Any remaining messages on this user's own delivery requests.
      await tx.deliveryMessage.deleteMany({ where: { request: { customerId: userId } } })
      if (partnerProfile) {
        // Detach this partner from other customers' requests (keep those requests).
        await tx.deliveryRequest.updateMany({ where: { partnerId: partnerProfile.id }, data: { partnerId: null } })
      }
      // Delete this user's own requests (their messages are gone).
      await tx.deliveryRequest.deleteMany({ where: { customerId: userId } })
      if (partnerProfile) {
        await tx.deliveryPartnerProfile.delete({ where: { id: partnerProfile.id } })
      }

      // Acknowledgments this user made.
      await tx.acknowledgment.deleteMany({ where: { userId } })

      // Orders as buyer or seller. Orders on this user's products carry their
      // sellerId, so this also frees those products from the Order FK. Each
      // deleted order cascades its own acknowledgments.
      await tx.order.deleteMany({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] } })

      // Reviews & comments this user wrote (on any product).
      await tx.review.deleteMany({ where: { userId } })
      await tx.comment.deleteMany({ where: { userId } })

      // Messages this user sent, then the conversations they belong to
      // (deleting a conversation cascades the other party's messages).
      await tx.message.deleteMany({ where: { senderId: userId } })
      await tx.conversation.deleteMany({
        where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
      })

      // Finally the user. DB-level cascades now remove the storefront, its
      // products & media, this user's products, agreement signatures and
      // feedback; audit-log rows are kept with actorId set to null.
      await tx.user.delete({ where: { id: userId } })
    },
    { timeout: 20000 }
  )
}

/**
 * Returns reasons a storefront can't be safely hard-deleted yet (money in
 * motion on its orders). Empty array means safe.
 */
export async function getStorefrontDeletionBlockers(storefrontId: string): Promise<string[]> {
  const blockers: string[] = []
  const liveOrders = await db.order.count({
    where: { AND: [{ storefrontId }, { OR: IN_MOTION_ORDER_OR }] },
  })
  if (liveOrders > 0) {
    blockers.push(
      `${liveOrders} order${liveOrders === 1 ? '' : 's'} with money in motion (paid, in transit, delivered, disputed, or a payout/refund still processing)`
    )
  }
  return blockers
}

/**
 * Permanently removes a storefront and all of its products (and their media,
 * reviews, comments) plus its order history. The OWNER's account is left
 * intact. Caller MUST check getStorefrontDeletionBlockers first.
 */
export async function hardDeleteStorefront(storefrontId: string): Promise<void> {
  await db.$transaction(
    async (tx) => {
      // Remove all orders tied to this storefront first (frees its products
      // from the Order FK; each order cascades its acknowledgments).
      await tx.order.deleteMany({ where: { storefrontId } })
      // Delete the storefront — cascades its products, product media, and the
      // reviews/comments on those products.
      await tx.storefront.delete({ where: { id: storefrontId } })
    },
    { timeout: 20000 }
  )
}
