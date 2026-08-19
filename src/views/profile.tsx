'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductCard } from '@/components/product-card'
import { api } from '@/lib/api'
import { Store, Package, MessageSquare, ChevronRight, ShieldCheck, Edit, Star, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { ReferralSummaryCard } from '@/components/referral-summary-card'
import { EmailVerificationBanner } from '@/components/email-verification-banner'

export function ProfilePage() {
  const { user, setView } = useStore()
  const [storefront, setStorefront] = useState<any>(null)
  const [orders, setOrders] = useState<{ asBuyer: any[]; asSeller: any[] }>({ asBuyer: [], asSeller: [] })

  useEffect(() => {
    if (!user) return
    Promise.all([
      api<{ storefront: any }>('/api/storefront/me'),
      api<{ orders: any }>('/api/orders/list'),
    ]).then(([sf, ords]) => {
      if (sf.data?.storefront) setStorefront(sf.data.storefront)
      if (ords.data?.orders) setOrders(ords.data.orders)
    })
  }, [user])

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Please sign in.</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Your Profile</span>
      </div>

      <EmailVerificationBanner />

      <div className="bg-card border rounded-lg overflow-hidden mb-4">
        <div className="amazon-accent-bar h-2" />
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Avatar className="w-20 h-20 shrink-0">
              <AvatarImage src={user.profilePicture || undefined} />
              <AvatarFallback className="text-2xl">{user.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{user.fullName}</h1>
                {user.isAdmin && <Badge><ShieldCheck className="w-3 h-3 mr-1" /> Admin</Badge>}
              </div>
              <div className="grid sm:grid-cols-2 gap-1 text-sm text-muted-foreground">
                <p>Matric: <span className="font-medium text-foreground">{user.matricNumber}</span></p>
                <p>Email: <span className="font-medium text-foreground">{user.email}</span></p>
                <p>WhatsApp: <span className="font-medium text-foreground">{(user as any).phone || '—'}</span></p>
                <p>Department: <span className="font-medium text-foreground">{user.department}</span></p>
                <p>Level: <span className="font-medium text-foreground">{user.level}</span></p>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => toast.info('Profile editing coming soon')}>
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit Profile
                </Button>
                <Button size="sm" variant="outline" onClick={() => setView({ name: 'storefront' })}>
                  <Store className="w-3.5 h-3.5 mr-1" /> My Storefront
                </Button>
                <Button size="sm" variant="outline" onClick={() => setView({ name: 'orders' })}>
                  <Package className="w-3.5 h-3.5 mr-1" /> Orders
                </Button>
                <Button size="sm" variant="outline" onClick={() => setView({ name: 'inbox' })}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Inbox
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReferralSummaryCard />

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Purchases</p>
          <p className="text-2xl font-bold text-primary">{orders.asBuyer.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Sales</p>
          <p className="text-2xl font-bold text-primary">{orders.asSeller.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Listings</p>
          <p className="text-2xl font-bold text-primary">{storefront?.products?.length || 0}</p>
        </div>
      </div>

      {storefront && (
        <div>
          <h2 className="font-bold text-lg mb-2">Your Listings</h2>
          {storefront.products?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {storefront.products.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="bg-card border rounded-lg p-6 text-center">
              <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">You have no listings yet.</p>
              <Button className="mt-3" size="sm" onClick={() => setView({ name: 'sell' })}>Create a Listing</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
