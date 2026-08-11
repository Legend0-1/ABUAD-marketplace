import { cookies } from 'next/headers'
import { db } from './db'
import { parseSessionToken } from './auth'

export type SessionUser = {
  id: string
  email: string
  fullName: string
  matricNumber: string
  level: string
  department: string
  profilePicture: string | null
  isAdmin: boolean
  isBanned: boolean
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('abuad_session')?.value
    const parsed = parseSessionToken(token)
    if (!parsed) return null

    const user = await db.user.findUnique({
      where: { id: parsed.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        matricNumber: true,
        level: true,
        department: true,
        profilePicture: true,
        isAdmin: true,
        isBanned: true,
      },
    })
    if (!user) return null
    if (user.isBanned) return null
    return user
  } catch {
    return null
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (!user.isAdmin) throw new Error('Admin only')
  return user
}
