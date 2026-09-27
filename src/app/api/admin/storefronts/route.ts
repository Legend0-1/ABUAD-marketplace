import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { getStorefrontDeletionBlockers, hardDeleteStorefront } from '@/lib/account-deletion'

// List all storefronts (with status filter)
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { search } = new URL(req.url)
  const status = new URLSearchParams(search).get('status')

  const storefronts = await db.storefront.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { id: true, fullName: true, matricNumber: true, department: true, level: true, email: true, profilePicture: true } },
      _count: { select: { products: true, orders: true } },
    },
  })

  return NextResponse.json({ storefronts })
}

// Approve / reject / suspend a storefront
export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { storefrontId, action } = await req.json()
  // action: "approve" | "reject" | "suspend" | "reactivate"
  const statusMap: Record<string, string> = {
    approve: 'active',
    reject: 'rejected',
    suspend: 'suspended',
    reactivate: 'active',
  }
  const newStatus = statusMap[action]
  if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const storefront = await db.storefront.update({
    where: { id: storefrontId },
    data: { status: newStatus },
    include: { owner: { select: { id: true, fullName: true, email: true } } },
  })

  // Notify the seller via an admin_direct conversation
  {
    let conv = await db.conversation.findFirst({
      where: { type: 'admin_direct', participantAId: admin.id, participantBId: storefront.ownerId },
    })
    if (!conv) {
      conv = await db.conversation.create({
        data: { type: 'admin_direct', participantAId: admin.id, participantBId: storefront.ownerId, subject: 'Storefront status update' },
      })
    }
    const msg = action === 'approve'
      ? `Your storefront "${storefront.name}" has been approved. You can now list and sell on the platform.`
      : action === 'reject'
      ? `Your storefront "${storefront.name}" application has been rejected. Please contact admin for more details.`
      : action === 'suspend'
      ? `Your storefront "${storefront.name}" has been suspended. Please contact admin to resolve this.`
      : `Your storefront "${storefront.name}" has been reactivated.`
    await db.message.create({
      data: { conversationId: conv.id, senderId: admin.id, body: msg },
    })
  }

  await logAudit({ actor: admin, action: `storefront.${action}`, targetType: 'Storefront', targetId: storefront.id, detail: `${storefront.name} → ${newStatus}` })

  return NextResponse.json({ storefront, message: `Storefront ${action}d` })
}

// Permanently delete a storefront and all of its listings + order history.
// The owner's account is left intact. Irreversible.
export async function DELETE(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { storefrontId } = await req.json()
  if (!storefrontId) return NextResponse.json({ error: 'storefrontId is required' }, { status: 400 })

  const storefront = await db.storefront.findUnique({
    where: { id: storefrontId },
    select: { name: true, owner: { select: { fullName: true, email: true } } },
  })
  if (!storefront) return NextResponse.json({ error: 'Storefront not found' }, { status: 404 })

  const blockers = await getStorefrontDeletionBlockers(storefrontId)
  if (blockers.length > 0) {
    return NextResponse.json(
      {
        error: `Can't delete this storefront yet — ${blockers.join('; ')}. Settle or refund those first, or suspend it instead.`,
      },
      { status: 409 }
    )
  }

  try {
    await hardDeleteStorefront(storefrontId)
  } catch (e: any) {
    console.error('hard-delete storefront failed', e)
    return NextResponse.json({ error: 'Could not delete this storefront. Nothing was changed.' }, { status: 500 })
  }

  await logAudit({
    actor: admin,
    action: 'storefront.delete',
    targetType: 'Storefront',
    targetId: storefrontId,
    detail: `Permanently deleted storefront "${storefront.name}" (owner: ${storefront.owner?.fullName || 'unknown'})`,
  })

  return NextResponse.json({ ok: true, message: 'Storefront permanently deleted' })
}
