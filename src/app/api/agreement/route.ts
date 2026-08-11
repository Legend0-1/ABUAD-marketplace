import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const agreement = await db.agreement.findFirst({ where: { isActive: true } })
  if (!agreement) return NextResponse.json({ agreement: null })
  return NextResponse.json({ agreement })
}
