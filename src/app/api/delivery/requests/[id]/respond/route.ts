import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { resolveBankCode, createTransferRecipient, initiateTransfer } from '@/lib/paystack'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { accept } = await req.json() // boolean

  const request = await db.deliveryRequest.findUnique({ where: { id }, include: { partner: true } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (!request.partner || request.partner.userId !== user.id) {
    return NextResponse.json({ error: 'This request is not assigned to you' }, { status: 403 })
  }
  if (request.status !== 'awaiting_partner') {
    return NextResponse.json({ error: `This request is no longer awaiting your response (${request.status})` }, { status: 400 })
  }

  if (!accept) {
    // Bounce back to the HR queue for reassignment, rather than dead-ending the request.
    const updated = await db.deliveryRequest.update({
      where: { id },
      data: { status: 'pending_hr', partnerId: null, assignedById: null },
    })
    await logAudit({ actor: user, action: 'delivery_request.declined', targetType: 'DeliveryRequest', targetId: id, detail: request.reference })
    return NextResponse.json({ request: updated })
  }

  // Accepted. For buy_and_deliver, release the item cost immediately — this is
  // the one deliberate exception to platform-wide escrow-until-confirmation,
  // because the partner needs capital to actually go buy the item. Gated
  // upstream by the assign route requiring typeAEligible, and here again as a
  // defense-in-depth check in case eligibility was revoked after assignment.
  let itemCostReleasedAt: Date | null = null
  let itemCostTransferRef: string | null = null

  if (request.type === 'buy_and_deliver' && request.itemCost) {
    let partner = request.partner
    if (!partner.typeAEligible) {
      return NextResponse.json({ error: 'Your Type-A (buy & deliver) eligibility was revoked. Contact HR.' }, { status: 403 })
    }

    try {
      let recipientCode = partner.recipientCode
      if (!recipientCode) {
        let bankCode = partner.bankCode
        if (!bankCode) {
          bankCode = await resolveBankCode(partner.bankName)
          if (!bankCode) throw new Error(`Could not resolve bank code for "${partner.bankName}"`)
        }
        const recipient = await createTransferRecipient({
          accountName: partner.accountName,
          accountNumber: partner.accountNumber,
          bankCode,
        })
        recipientCode = recipient.recipient_code
        partner = await db.deliveryPartnerProfile.update({
          where: { id: partner.id },
          data: { bankCode, recipientCode },
        })
      }

      const transferRef = `DLVITEM-${request.reference}`
      const transfer = await initiateTransfer({
        amountNaira: request.itemCost,
        recipientCode,
        reference: transferRef,
        reason: `Item cost advance for delivery ${request.reference}`,
      })
      itemCostTransferRef = transferRef
      itemCostReleasedAt = new Date()

      await logAudit({
        actor: user,
        action: 'delivery_request.item_cost_released',
        targetType: 'DeliveryRequest',
        targetId: id,
        detail: `₦${request.itemCost.toLocaleString()} to ${partner.id} (transfer status: ${transfer.status})`,
      })
    } catch (transferError: any) {
      console.error('item cost transfer failed', transferError)
      return NextResponse.json({
        error: 'Could not release item cost payment. This has been flagged — contact HR before proceeding with the purchase.',
      }, { status: 500 })
    }
  }

  const updated = await db.deliveryRequest.update({
    where: { id },
    data: {
      status: 'in_progress',
      itemCostReleasedAt,
      itemCostTransferRef,
    },
  })

  return NextResponse.json({ request: updated })
}
