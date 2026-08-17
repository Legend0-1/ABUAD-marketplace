import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { resolveBankCode, createTransferRecipient, initiateTransfer } from '@/lib/paystack'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const request = await db.deliveryRequest.findUnique({ where: { id }, include: { partner: true } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (request.customerId !== user.id) return NextResponse.json({ error: 'Only the customer can confirm this delivery' }, { status: 403 })
  if (request.status !== 'in_progress') {
    return NextResponse.json({ error: `This request can't be confirmed yet (${request.status})` }, { status: 400 })
  }
  if (!request.partner) return NextResponse.json({ error: 'No partner assigned' }, { status: 400 })

  // Record the confirmation itself first -- it's a real-world fact (the
  // customer received the item/service) that shouldn't be undone by a
  // downstream payment API failure. Payout failures are flagged for admin
  // follow-up rather than blocking the state transition.
  const updated = await db.deliveryRequest.update({
    where: { id },
    data: { status: 'completed', customerConfirmedAt: new Date() },
  })

  try {
    let partner = request.partner
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

    const transferRef = `DLVFEE-${request.reference}`
    const transfer = await initiateTransfer({
      amountNaira: request.serviceFee,
      recipientCode,
      reference: transferRef,
      reason: `Delivery service fee for ${request.reference}`,
    })

    await db.deliveryRequest.update({
      where: { id },
      data: { serviceFeeReleasedAt: new Date(), serviceFeeTransferRef: transferRef },
    })

    await db.deliveryPartnerProfile.update({
      where: { id: partner.id },
      data: { trustScore: { increment: 1 } },
    })

    await logAudit({
      actor: user,
      action: 'delivery_request.completed',
      targetType: 'DeliveryRequest',
      targetId: id,
      detail: `₦${request.serviceFee.toLocaleString()} service fee released (transfer status: ${transfer.status})`,
    })

    return NextResponse.json({ request: { ...updated, serviceFeeReleasedAt: new Date() } })
  } catch (transferError: any) {
    console.error('service fee transfer failed', transferError)
    await logAudit({ actor: user, action: 'delivery_request.payout_failed', targetType: 'DeliveryRequest', targetId: id, detail: String(transferError?.message || transferError) })
    // Confirmation still stands -- just the payout needs manual follow-up.
    return NextResponse.json({
      request: updated,
      warning: 'Receipt confirmed, but the payout to the partner failed to process automatically. Admin has been notified to follow up.',
    })
  }
}
