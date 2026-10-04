'use client'

import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ChevronRight } from 'lucide-react'

// Shown on the selling entry points (set-up-storefront, new listing) when a
// signed-in user hasn't completed ID verification yet. Mirrors the server-side
// gate in /api/storefront/setup and /api/products/create, so the user is never
// surprised by a 403 — they're routed to verification up front instead.
export function VerificationGate({
  context,
}: {
  context: 'storefront' | 'listing'
}) {
  const { setView } = useStore()

  const line =
    context === 'storefront'
      ? 'Before you can open a storefront, we need to confirm who you are.'
      : 'Before you can list items for sale, we need to confirm who you are.'

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-10">
      <div className="bg-card border rounded-lg p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Verify your identity first</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {line} It's a one-time step: upload a photo of a government ID (National ID,
          voter's card, driver's licence, or passport). This keeps UNI MART free of
          impersonators and protects both buyers and sellers.
        </p>
        <div className="flex gap-2 justify-center mt-5">
          <Button size="lg" onClick={() => setView({ name: 'verify-identity' })}>
            <ShieldCheck className="w-4 h-4 mr-2" /> Verify my identity
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => setView({ name: 'home' })}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
