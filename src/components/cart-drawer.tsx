'use client'

import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { X, ShoppingCart, Trash2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, removeFromCart, clearCart, user, setView, setAuthModalOpen } = useStore()
  const [busy, setBusy] = useState(false)

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0)

  const checkout = async () => {
    if (!user) {
      setCartOpen(false)
      setAuthModalOpen(true)
      return
    }
    if (cart.length === 0) return
    setBusy(true)
    let success = 0
    let failed = 0
    for (const item of cart) {
      const { error } = await api('/api/orders/create', {
        method: 'POST',
        body: { productId: item.productId, quantity: item.quantity },
      })
      if (error) failed++
      else success++
    }
    setBusy(false)
    if (success > 0) {
      toast.success(`Placed ${success} order${success > 1 ? 's' : ''}`, {
        description: failed > 0 ? `${failed} failed — your sellers will message you.` : 'Your sellers will message you with delivery details.',
      })
      clearCart()
      setCartOpen(false)
      setView({ name: 'orders' })
    } else {
      toast.error('Checkout failed', { description: 'Please try again.' })
    }
  }

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Your Cart ({cart.length})
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          {cart.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm">Browse the marketplace to add items.</p>
            </div>
          )}
          {cart.map((item) => (
            <div key={item.productId} className="flex gap-3 p-2 border rounded-lg">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No img</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                <p className="text-sm font-bold text-primary mt-1">₦{(item.price * item.quantity).toLocaleString()}</p>
              </div>
              <button onClick={() => removeFromCart(item.productId)} className="p-1 hover:bg-muted rounded self-start">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <SheetFooter className="p-4 border-t flex-col">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-sm text-muted-foreground">Subtotal ({cart.reduce((s, c) => s + c.quantity, 0)} items)</span>
              <span className="text-lg font-bold">₦{total.toLocaleString()}</span>
            </div>
            <Button onClick={checkout} disabled={busy} className="w-full" size="lg">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing orders…</> : 'Proceed to Checkout'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Each item is ordered from its respective seller. You will only be charged after acknowledging receipt.
            </p>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
