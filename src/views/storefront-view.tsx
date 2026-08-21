'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Store, Star, Package, ShieldCheck, MessageSquare, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export function StorefrontViewPage({ ownerId }: { ownerId: string }) {
  const { setView, user, setAuthModalOpen } = useStore()
  const [storefront, setStorefront] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      // We don't have a dedicated endpoint; fetch via products list filtered by seller
      // Simpler: use search? We'll add a lightweight fetch using the storefront data from a product.
      // Since we don't have a per-seller endpoint, use a workaround: fetch /api/products/list and filter.
      const { data } = await api<{ products: any[] }>('/api/products/list?limit=100')
      if (data?.products) {
        const mine = data.products.filter((p) => p.seller?.id === ownerId)
        if (mine.length > 0) {
          setStorefront({
            name: mine[0].storefront?.name,
            rating: mine[0].storefront?.rating,
            status: mine[0].storefront?.status,
            products: mine,
            owner: mine[0].seller,
          })
        }
      }
      setLoading(false)
    })()
  }, [ownerId])

  const onMessage = async () => {
    if (!user) { setAuthModalOpen(true); return }
    if (user.id === ownerId) { toast.info('This is your own storefront'); return }
    const { data, error } = await api('/api/messages/conversations', {
      method: 'POST',
      body: { otherUserId: ownerId, subject: storefront?.name ? `About ${storefront.name}` : 'Hello', body: 'Hi! I came across your storefront and would like to chat.' },
    })
    if (error) { toast.error(error); return }
    toast.success('Started a conversation')
    setView({ name: 'inboxThread', conversationId: data.conversationId })
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      </div>
    )
  }

  if (!storefront) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Store className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
        <p className="font-bold">Storefront not found or has no active listings</p>
        <Button className="mt-3" onClick={() => setView({ name: 'home' })}>Back to home</Button>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{storefront.name}</span>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden mb-4">
        <div className="amazon-accent-bar h-2" />
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={storefront.owner?.profilePicture || undefined} />
              <AvatarFallback className="text-xl"><Store className="w-7 h-7" /></AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{storefront.name}</h1>
                {storefront.status === 'active' && <Badge className="bg-green-600 text-white"><ShieldCheck className="w-3 h-3 mr-1" /> Verified</Badge>}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {storefront.rating?.toFixed?.(1) || 'New'} rating</span>
                <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {storefront.products.length} listings</span>
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Verified student</span>
                <span>{storefront.owner?.department} · {storefront.owner?.level} Level</span>
              </div>
            </div>
            {user && user.id !== ownerId && (
              <Button onClick={onMessage}><MessageSquare className="w-4 h-4 mr-2" /> Message Seller</Button>
            )}
          </div>
        </div>
      </div>

      <h2 className="font-bold text-lg mb-3">Listings</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {storefront.products.map((p: any) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}
