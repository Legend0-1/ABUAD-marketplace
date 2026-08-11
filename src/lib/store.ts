'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SessionUser = {
  id: string
  email: string
  fullName: string
  matricNumber: string
  level: string
  department: string
  profilePicture: string | null
  isAdmin: boolean
}

export type View =
  | { name: 'home' }
  | { name: 'category'; slug: string; categoryName?: string }
  | { name: 'product'; id: string }
  | { name: 'search'; q: string }
  | { name: 'sell' } // create listing
  | { name: 'storefront' } // my storefront dashboard
  | { name: 'storefrontView'; ownerId: string }
  | { name: 'orders' } // my orders (buy+sell)
  | { name: 'inbox' }
  | { name: 'inboxThread'; conversationId: string }
  | { name: 'profile' }
  | { name: 'admin' }
  | { name: 'agreement' }
  | { name: 'setup-storefront' }

type CartItem = {
  productId: string
  title: string
  price: number
  quantity: number
  sellerId: string
  image?: string
}

type Store = {
  user: SessionUser | null
  setUser: (u: SessionUser | null) => void

  view: View
  setView: (v: View) => void

  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void

  // UI overlays
  authModalOpen: boolean
  setAuthModalOpen: (v: boolean) => void
  authMode: 'login' | 'register'
  setAuthMode: (v: 'login' | 'register') => void

  cartOpen: boolean
  setCartOpen: (v: boolean) => void

  // Toast notifications
  toasts: { id: string; title: string; description?: string; variant?: 'default' | 'success' | 'error' }[]
  toast: (t: { title: string; description?: string; variant?: 'default' | 'success' | 'error' }) => void
  dismissToast: (id: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (u) => set({ user: u }),

      view: { name: 'home' },
      setView: (v) => {
        set({ view: v })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },

      cart: [],
      addToCart: (item) => {
        const existing = get().cart.find((c) => c.productId === item.productId)
        if (existing) {
          set({ cart: get().cart.map((c) => (c.productId === item.productId ? { ...c, quantity: c.quantity + item.quantity } : c)) })
        } else {
          set({ cart: [...get().cart, item] })
        }
      },
      removeFromCart: (productId) => set({ cart: get().cart.filter((c) => c.productId !== productId) }),
      clearCart: () => set({ cart: [] }),

      authModalOpen: false,
      setAuthModalOpen: (v) => set({ authModalOpen: v }),
      authMode: 'register',
      setAuthMode: (v) => set({ authMode: v }),

      cartOpen: false,
      setCartOpen: (v) => set({ cartOpen: v }),

      toasts: [],
      toast: (t) => {
        const id = Math.random().toString(36).slice(2)
        set({ toasts: [...get().toasts, { id, ...t }] })
        setTimeout(() => {
          set({ toasts: get().toasts.filter((x) => x.id !== id) })
        }, 4500)
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
    }),
    {
      name: 'abuad-marketplace',
      partialize: (s) => ({ cart: s.cart, view: s.view }) as any,
    }
  )
)
