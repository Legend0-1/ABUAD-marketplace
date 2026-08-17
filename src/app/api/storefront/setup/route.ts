import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      name, description, type,
      bankName, accountName, accountNumber, phoneNumber, contactEmail,
      agreementId, agreementAccepted,
    } = body

    if (!name || !description || !type || !bankName || !accountName || !accountNumber || !phoneNumber || !contactEmail) {
      return NextResponse.json({ error: 'All storefront fields are required' }, { status: 400 })
    }

    if (!agreementAccepted || !agreementId) {
      return NextResponse.json({ error: 'You must read and accept the Seller Agreement to continue' }, { status: 400 })
    }

    // Check existing storefront
    const existing = await db.storefront.findUnique({ where: { ownerId: user.id } })
    if (existing) {
      return NextResponse.json({ error: 'You already have a storefront' }, { status: 400 })
    }

    // Validate agreement is the current active one
    const agreement = await db.agreement.findUnique({ where: { id: agreementId } })
    if (!agreement || !agreement.isActive) {
      return NextResponse.json({ error: 'Agreement is no longer active. Please reload and try again.' }, { status: 400 })
    }

    // Food/drink sales are not permitted on the platform. Block storefronts
    // that are clearly food-focused at setup, rather than silently letting
    // them through or routing them to an approval queue that no longer applies.
    const looksLikeFood = /\b(food|drink|meal|kitchen|snack|jollof|pastr|zobo|catering)\b/i.test(`${name} ${description}`)
    if (looksLikeFood) {
      return NextResponse.json({
        error: 'Food and drink sales are not currently permitted on UNI MART. Please remove food/drink references from your storefront name and description, or choose a different category. See our Campus Safety Policy for details.',
      }, { status: 400 })
    }
    const status = 'active'

    const [storefront] = await db.$transaction([
      db.storefront.create({
        data: {
          ownerId: user.id,
          name, description, type,
          bankName, accountName, accountNumber, phoneNumber, contactEmail,
          status,
        },
      }),
      db.agreementSignature.create({
        data: { agreementId, userId: user.id },
      }),
    ])

    return NextResponse.json({ storefront, agreementSigned: true })
  } catch (e: any) {
    console.error('storefront setup error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
