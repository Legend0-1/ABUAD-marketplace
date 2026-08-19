import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseEmailVerificationToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const token = req.nextUrl.searchParams.get('token')

  const parsed = parseEmailVerificationToken(token)
  if (!parsed) {
    return NextResponse.redirect(`${appUrl}/?view=home&emailVerify=error`)
  }

  const user = await db.user.findUnique({ where: { id: parsed.userId } })
  // The email in the token must still match the account's current email --
  // if they changed their email after this link was sent, an old link
  // shouldn't verify whatever address is on file now.
  if (!user || user.email.toLowerCase() !== parsed.email.toLowerCase()) {
    return NextResponse.redirect(`${appUrl}/?view=home&emailVerify=error`)
  }

  await db.user.update({ where: { id: user.id }, data: { emailVerified: true } })

  return NextResponse.redirect(`${appUrl}/?view=home&emailVerify=success`)
}
