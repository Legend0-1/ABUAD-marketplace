import Link from 'next/link'
import { Compass } from 'lucide-react'

// Shown for unmatched routes / notFound() calls, instead of a bare 404.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-7 h-7 text-primary" />
        </div>
        <p className="text-4xl font-black mb-1">404</p>
        <h1 className="text-lg font-bold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="cta-gradient rounded-full px-5 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2 border-0"
        >
          Back to UNI MART
        </Link>
      </div>
    </div>
  )
}
