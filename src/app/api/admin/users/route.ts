import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { logAudit } from '@/lib/audit'

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
