import { db } from '@/lib/db'

// --- Inventory bookkeeping ---------------------------------------------------
//
// Stock is only ever adjusted for physical products ("product" kind); services
// have effectively unlimited availability so they're skipped.
//
// The golden rule for these helpers: only call decrementStockForPaidOrder AFTER
// you have *atomically* transitioned the order into 'paid' (e.g. with an
// updateMany guarded on `status: 'pending'` that returned count === 1). That
// guarantees exactly one caller runs this per order, so the webhook and the
// browser-redirect verify handler can't both decrement the same sale.

export async function decrementStockForPaidOrder(orderId: string): Promise<void> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    })
    if (!order || !order.product) return
    if (order.product.kind !== 'product') return // services aren't inventory-tracked

    const newStock = Math.max(0, order.product.stock - order.quantity)
    await db.product.update({
      where: { id: order.product.id },
      data: {
        stock: newStock,
        // Auto-hide from listings once depleted. Leave paused/removed listings
        // in whatever state the seller chose — only flip an otherwise-active one.
        ...(newStock === 0 && order.product.status === 'active'
          ? { status: 'out_of_stock' }
          : {}),
      },
    })
  } catch (e) {
    // Never let inventory bookkeeping break payment confirmation. The order is
    // already paid; any drift can be reconciled by the seller from their
    // storefront. We just log it.
    console.error('stock decrement failed for order', orderId, e)
  }
}

// Mirror image, used when a paid order is refunded: return the units to stock
// and un-hide the listing if it had auto-gone out of stock.
export async function restockForRefundedOrder(orderId: string): Promise<void> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    })
    if (!order || !order.product) return
    if (order.product.kind !== 'product') return

    await db.product.update({
      where: { id: order.product.id },
      data: {
        stock: { increment: order.quantity },
        ...(order.product.status === 'out_of_stock' ? { status: 'active' } : {}),
      },
    })
  } catch (e) {
    console.error('restock failed for order', orderId, e)
  }
}
