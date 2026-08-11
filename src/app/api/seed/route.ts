import { NextResponse } from 'next/server'
import { bootstrapMarketplace } from '@/lib/bootstrap'

// Trigger marketplace bootstrap (admin + categories + agreement + demo data).
// Safe to call multiple times.
export async function POST() {
  try {
    await bootstrapMarketplace()
    return NextResponse.json({ ok: true, message: 'Marketplace bootstrapped' })
  } catch (e: any) {
    console.error('seed error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    await bootstrapMarketplace()
    return NextResponse.json({ ok: true, message: 'Marketplace bootstrapped' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
