'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { CampusSetupModal } from '@/components/campus-setup-modal'
import { Lock, GraduationCap, ShieldCheck } from 'lucide-react'

/**
 * Wraps the browse surface (home, category, product, search) and enforces the
 * "login + campus" rule:
 *   - logged out  → a sign-in prompt (opens the auth modal)
 *   - logged in, no campus set → a one-time campus-setup prompt
 *   - logged in with a campus (or an admin) → children render
 *
 * The server also enforces this in the product/search routes, so this gate is
 * purely the friendly UX layer — it never stands in for the API filter.
 */
export function CampusGate({ children, hint }: { children: React.ReactNode; hint?: string }) {
  const { user, setAuthModalOpen } = useStore()
  const [setupOpen, setSetupOpen] = useState(false)

  // Admins see everything, campus or not.
  if (user?.isAdmin) return <>{children}</>

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Sign in to browse your campus</h1>
        <p className="text-muted-foreground mb-6">
          {hint || 'UNI MART listings are visible to verified students only. Sign in to see what’s for sale on your campus.'}
        </p>
        <Button size="lg" className="cta-gradient border-0 rounded-full" onClick={() => setAuthModalOpen(true)}>
          <ShieldCheck className="w-4 h-4 mr-2" /> Sign in / Create account
        </Button>
      </div>
    )
  }

  if (!user.institution) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Set your campus to start trading</h1>
        <p className="text-muted-foreground mb-6">
          Tell us which institution you attend so we can show you listings from your own campus — and so your classmates can find you.
        </p>
        <Button size="lg" className="cta-gradient border-0 rounded-full" onClick={() => setSetupOpen(true)}>
          <GraduationCap className="w-4 h-4 mr-2" /> Choose my campus
        </Button>
        <CampusSetupModal open={setupOpen} onOpenChange={setSetupOpen} />
      </div>
    )
  }

  return <>{children}</>
}
