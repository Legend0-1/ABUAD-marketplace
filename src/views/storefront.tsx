'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Store, Plus, Package, MessageSquare, Star, ChevronRight, Banknote, Phone, Mail,
  CheckCircle2, AlertCircle, TrendingUp, ShoppingBag, XCircle,
} from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { toast } from 'sonner'

export function StorefrontPage() {
  const { user, setView, setAuthModalOpen } = useStore()
  const [storefront, setStorefront] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    const { data } = await api<{ storefront: any }>('/api/storefront/me')
    setStorefront(data?.storefront || null)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); return }
    reload()
  }, [user, setAuthModalOpen])

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Please sign in.</div>
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
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <Store className="w-16 h-16 mx-auto mb-3 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold">You don't have a storefront yet</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Set up your storefront to start selling. It takes less than 5 minutes.</p>
        <Button size="lg" onClick={() => setView({ name: 'setup-storefront' })}>
          <Store className="w-4 h-4 mr-2" /> Set up Storefront
        </Button>
      </div>
    )
  }

  const pendingOrders = storefront.orders?.filter((o: any) => o.status === 'pending' || o.status === 'paid') || []
  const activeOrders = storefront.orders?.filter((o: any) => ['in_transit', 'delivered', 'acknowledged', 'disputed'].includes(o.status)) || []
  const completedOrders = storefront.orders?.filter((o: any) => o.status === 'completed' || o.status === 'refunded') || []

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-6">
      {/* Storefront header */}
      <div className="bg-card border rounded-lg overflow-hidden mb-4">
        <div className="amazon-accent-bar h-2" />
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Store className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{storefront.name}</h1>
                <Badge variant={storefront.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                  {storefront.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{storefront.description}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {storefront.rating?.toFixed?.(1) || 'New'}</span>
                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {storefront.products?.length || 0} listings</span>
                <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> ₦{(storefront.totalSales || 0).toLocaleString()} total sales</span>
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {storefront.phoneNumber}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {storefront.contactEmail}</span>
              </div>
            </div>
            <Button onClick={() => setView({ name: 'sell' })}>
              <Plus className="w-4 h-4 mr-1" /> New Listing
            </Button>
          </div>
          {storefront.status === 'pending_approval' && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded p-3 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-700 dark:text-amber-400">Pending admin approval</p>
                <p className="text-amber-700/80 dark:text-amber-400/80">Your storefront is under review by the admin team. You'll be notified in your inbox once approved.</p>
              </div>
            </div>
          )}
          {storefront.status === 'suspended' && (
            <div className="mt-3 bg-red-50 dark:bg-red-950/30 border border-red-500/30 rounded p-3 text-sm flex gap-2">
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-700 dark:text-red-400">Storefront suspended</p>
                <p className="text-red-700/80 dark:text-red-400/80">Please contact the admin via your inbox to resolve this.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings">Listings ({storefront.products?.length || 0})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({storefront.orders?.length || 0})</TabsTrigger>
          <TabsTrigger value="payouts">Payout Info</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-4">
          {storefront.products?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {storefront.products.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border rounded-lg">
              <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-bold">No listings yet</p>
              <Button className="mt-3" onClick={() => setView({ name: 'sell' })}><Plus className="w-4 h-4 mr-1" /> Create your first listing</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-4">
          {pendingOrders.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-amber-500" /> Pending / Awaiting Your Action ({pendingOrders.length})</h3>
              <div className="space-y-2">
                {pendingOrders.map((o: any) => <OrderRow key={o.id} order={o} role="seller" />)}
              </div>
            </div>
          )}
          {activeOrders.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-primary" /> Active ({activeOrders.length})</h3>
              <div className="space-y-2">
                {activeOrders.map((o: any) => <OrderRow key={o.id} order={o} role="seller" />)}
              </div>
            </div>
          )}
          {completedOrders.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Completed ({completedOrders.length})</h3>
              <div className="space-y-2">
                {completedOrders.map((o: any) => <OrderRow key={o.id} order={o} role="seller" />)}
              </div>
            </div>
          )}
          {storefront.orders?.length === 0 && (
            <div className="text-center py-12 bg-card border rounded-lg">
              <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-bold">No orders yet</p>
              <p className="text-sm text-muted-foreground">Orders from buyers will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <h3 className="font-bold mb-2">Bank Payout Details</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Bank:</span> <strong>{storefront.bankName}</strong></div>
              <div><span className="text-muted-foreground">Account Name:</span> <strong>{storefront.accountName}</strong></div>
              <div><span className="text-muted-foreground">Account Number:</span> <strong>{storefront.accountNumber}</strong></div>
              <div><span className="text-muted-foreground">Phone:</span> <strong>{storefront.phoneNumber}</strong></div>
              <div><span className="text-muted-foreground">Email:</span> <strong>{storefront.contactEmail}</strong></div>
            </div>
            <div className="mt-4 p-3 bg-primary/5 rounded text-sm">
              <p className="font-bold text-primary">Total Sales (after 20% charge)</p>
              <p className="text-2xl font-black text-primary">₦{(storefront.totalSales || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Payouts are released to your bank account after each buyer acknowledges receipt.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OrderRow({ order, role }: { order: any; role: 'buyer' | 'seller' }) {
  const { setView } = useStore()
  const cover = order.product?.media?.[0]
  const other = role === 'buyer' ? order.seller : order.buyer
  return (
    <div className="bg-card border rounded-lg p-3 flex items-center gap-3">
      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
        {cover ? <img src={cover.url} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-3 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{order.product?.title}</p>
        <p className="text-xs text-muted-foreground">
          {role === 'buyer' ? 'From' : 'To'}: {other?.fullName} · {order.reference}
        </p>
        <p className="text-xs">
          <span className="font-bold text-primary">₦{order.totalAmount.toLocaleString()}</span>
          <span className="text-muted-foreground"> · payout ₦{order.sellerPayout.toLocaleString()}</span>
        </p>
      </div>
      <div className="text-right shrink-0">
        <Badge className={
          order.status === 'completed' ? 'bg-green-600 text-white' :
          order.status === 'disputed' ? 'bg-red-600 text-white' :
          order.status === 'acknowledged' ? 'bg-blue-600 text-white' :
          'bg-amber-500 text-white'
        }>{order.status.replace('_', ' ')}</Badge>
        <Button size="sm" variant="ghost" className="mt-1 h-6 text-xs" onClick={() => setView({ name: 'orders' })}>Details</Button>
      </div>
    </div>
  )
}
