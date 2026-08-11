'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, ShieldCheck, ScrollText } from 'lucide-react'

export function AgreementPage() {
  const { setView } = useStore()
  const [agreement, setAgreement] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await api<{ agreement: any }>('/api/agreement')
      setAgreement(data?.agreement || null)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Seller Agreement</span>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="amazon-accent-bar h-1.5" />
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{agreement?.title || 'Seller Agreement'}</h1>
              <p className="text-xs text-muted-foreground">Version {agreement?.version} · Service charge: {agreement?.serviceChargePercent}%</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded p-3 mb-4 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>This agreement may be reviewed. Any revisions will be communicated to every seller via inbox and email at least 7 days before they take effect.</span>
          </div>

          <div className="prose prose-sm max-w-none whitespace-pre-line text-sm leading-relaxed font-sans">
            {agreement?.body}
          </div>
        </div>
        <div className="p-4 bg-muted/50 border-t flex flex-wrap justify-between gap-2">
          <p className="text-xs text-muted-foreground self-center">Signed when you set up your storefront.</p>
          <Button onClick={() => setView({ name: 'setup-storefront' })}>Set up Storefront</Button>
        </div>
      </div>
    </div>
  )
}
