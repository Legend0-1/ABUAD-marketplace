'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

// Route-segment error boundary. Next.js renders this (inside the root layout)
// whenever a client/server component in the tree throws during render, instead
// of showing a blank white screen. `reset()` re-attempts the failed render.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface it for debugging without leaking details to the user.
    console.error('UNI MART error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6">
          An unexpected error interrupted this page. You can try again, or head back to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={reset}
            className="cta-gradient rounded-full px-5 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2 border-0"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <a
            href="/"
            className="rounded-full px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 border border-white/15 bg-white/5 hover:bg-white/10 transition text-foreground"
          >
            <Home className="w-4 h-4" /> Go home
          </a>
        </div>
        {error?.digest && (
          <p className="mt-4 text-[11px] text-muted-foreground/60">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
