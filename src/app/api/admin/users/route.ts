import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { getUserDeletionBlockers, hardDeleteUser } from '@/lib/account-deletion'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, fullName: true, matricNumber: true, level: true, department: true, profilePicture: true, isAdmin: true, isHR: true, isBanned: true, createdAt: true,
      _count: { select: { products: true, ordersAsBuyer: true, ordersAsSeller: true, reportsAgainst: true } },
    },
  })

  return NextResponse.json({ users })
}

// Ban / unban user
export async function POST(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { userId, action } = await req.json()
  const target = await db.user.findUnique({ where: { id: userId }, select: { fullName: true, isAdmin: true } })
  // action: "ban" | "unban" | "make_admin" | "remove_admin" | "make_hr" | "remove_hr"
  if (action === 'ban') {
    await db.user.update({ where: { id: userId }, data: { isBanned: true } })
    // Suspend storefront too
    await db.storefront.updateMany({ where: { ownerId: userId }, data: { status: 'suspended' } })
    await logAudit({ actor: admin, action: 'user.ban', targetType: 'User', targetId: userId, detail: `Banned ${target?.fullName || userId}` })
  } else if (action === 'unban') {
    await db.user.update({ where: { id: userId }, data: { isBanned: false } })
    await db.storefront.updateMany({ where: { ownerId: userId }, data: { status: 'active' } })
    await logAudit({ actor: admin, action: 'user.unban', targetType: 'User', targetId: userId, detail: `Unbanned ${target?.fullName || userId}` })
  } else if (action === 'make_admin') {
    await db.user.update({ where: { id: userId }, data: { isAdmin: true } })
    await logAudit({ actor: admin, action: 'user.make_admin', targetType: 'User', targetId: userId, detail: `${target?.fullName || userId} granted admin` })
  } else if (action === 'remove_admin') {
    if (target?.isAdmin) {
      const adminCount = await db.user.count({ where: { isAdmin: true } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last remaining admin account' }, { status: 400 })
      }
    }
    await db.user.update({ where: { id: userId }, data: { isAdmin: false } })
    await logAudit({ actor: admin, action: 'user.remove_admin', targetType: 'User', targetId: userId, detail: `${target?.fullName || userId} admin access revoked` })
  } else if (action === 'make_hr') {
    await db.user.update({ where: { id: userId }, data: { isHR: true } })
    await logAudit({ actor: admin, action: 'user.make_hr', targetType: 'User', targetId: userId, detail: `${target?.fullName || userId} granted HR access` })
  } else if (action === 'remove_hr') {
    await db.user.update({ where: { id: userId }, data: { isHR: false } })
    await logAudit({ actor: admin, action: 'user.remove_hr', targetType: 'User', targetId: userId, detail: `${target?.fullName || userId} HR access revoked` })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

// Permanently delete a user and everything tied to them. Irreversible.
export async function DELETE(req: Request) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  if (userId === admin.id) {
    return NextResponse.json({ error: 'You can\'t delete your own account while signed in as it.' }, { status: 400 })
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true, isAdmin: true },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Never let one admin delete another — force an explicit "remove admin" step
  // first, so a demotion is always a separate, deliberate decision.
  if (target.isAdmin) {
    return NextResponse.json(
      { error: 'This is an admin account. Remove their admin access first, then delete.' },
      { status: 400 }
    )
  }

  const blockers = await getUserDeletionBlockers(userId)
  if (blockers.length > 0) {
    return NextResponse.json(
      {
        error: `Can't delete this account yet — ${blockers.join('; ')}. Settle or refund those first, or ban the account instead.`,
      },
      { status: 409 }
    )
  }

  try {
    await hardDeleteUser(userId)
  } catch (e: any) {
    console.error('hard-delete user failed', e)
    return NextResponse.json({ error: 'Could not delete this account. Nothing was changed.' }, { status: 500 })
  }

  await logAudit({
    actor: admin,
    action: 'user.delete',
    targetType: 'User',
    targetId: userId,
    detail: `Permanently deleted ${target.fullName} (${target.email})`,
  })

  return NextResponse.json({ ok: true, message: 'Account permanently deleted' })
}
