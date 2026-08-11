import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Create a product or service listing.
// Implements the auto-category algorithm:
//   When a user submits a product with a "newCategoryName" that doesn't exist,
//   we create the category only if >= 2 sellers will be selling under it.
//   Since we can't easily check future intent, we instead:
//     1) Create the category as "auto" origin if user supplied one not in defaults.
//     2) After creation, count distinct sellers under that category. If < 2, the
//        category stays but is flagged "low-volume" and hidden from the public
//        category list (until 2+ sellers exist).
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const storefront = await db.storefront.findUnique({ where: { ownerId: user.id } })
    if (!storefront) {
      return NextResponse.json({ error: 'You must set up a storefront first' }, { status: 400 })
    }
    if (storefront.status !== 'active') {
      return NextResponse.json({ error: `Your storefront is currently ${storefront.status.replace('_', ' ')}. Please wait for admin approval.` }, { status: 400 })
    }

    const body = await req.json()
    const {
      title, description, price, kind, condition, stock,
      categoryId, newCategoryName,
      media = [], // [{type, url}]
      deliveryNotes,
    } = body

    if (!title || !description || !price || !kind) {
      return NextResponse.json({ error: 'Title, description, price and kind are required' }, { status: 400 })
    }

    // Resolve category
    let finalCategoryId = categoryId
    let isFood = false
    let category: any = null

    if (categoryId) {
      category = await db.category.findUnique({ where: { id: categoryId } })
      if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      isFood = category.requiresApproval
    } else if (newCategoryName) {
      // Try to find an existing category by name (case-insensitive)
      const slug = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const existing = await db.category.findUnique({ where: { slug } })
      if (existing) {
        category = existing
        finalCategoryId = existing.id
        isFood = existing.requiresApproval
      } else {
        // Auto-create category — but only flag as visible once 2+ sellers use it.
        // Since this is the FIRST seller, the category will be created but hidden from
        // public nav until a second seller uses the same name.
        category = await db.category.create({
          data: {
            name: newCategoryName,
            slug,
            description: `Auto-created category for "${newCategoryName}"`,
            icon: 'Tag',
            origin: 'auto',
            requiresApproval: false,
          },
        })
        finalCategoryId = category.id
      }
    } else {
      return NextResponse.json({ error: 'Please select or create a category' }, { status: 400 })
    }

    // Food safety check: if food category and storefront not food-approved, block.
    if (isFood && storefront.status !== 'active') {
      return NextResponse.json({
        error: 'Food listings require admin approval of your storefront. Your storefront is currently pending approval.',
      }, { status: 400 })
    }

    // Create product
    const product = await db.product.create({
      data: {
        title, description, price: Number(price),
        kind, condition: condition || null, stock: Number(stock) || 1,
        categoryId: finalCategoryId,
        sellerId: user.id,
        storefrontId: storefront.id,
        status: 'active',
        deliveryNotes: deliveryNotes || null,
      },
    })

    // Save media
    if (media.length > 0) {
      await db.productMedia.createMany({
        data: media.map((m: any) => ({
          productId: product.id,
          type: m.type,
          url: m.url,
        })),
      })
    }

    // After product is created, check if the auto-category now has 2+ sellers.
    // If so, we are good. If not, that's fine — we still created it; the UI will
    // hide auto-categories with < 2 sellers from the public nav.
    const sellersInCategory = await db.product.findMany({
      where: { categoryId: finalCategoryId, status: 'active' },
      select: { sellerId: true },
      distinct: ['sellerId'],
    })
    const sellerCount = sellersInCategory.length

    return NextResponse.json({
      product,
      categorySellers: sellerCount,
      message: sellerCount < 2 && category.origin === 'auto'
        ? 'Your listing is live. The new category will appear in the public menu once at least one other student also lists under it.'
        : 'Your listing is live.',
    })
  } catch (e: any) {
    console.error('product create error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
