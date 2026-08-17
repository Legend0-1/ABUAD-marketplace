'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Package, ChevronRight, CheckCircle2, AlertCircle, MessageSquare, Loader2, MapPin,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function OrdersPage() {
  const { user, setView, setAuthModalOpen } = useStore()
  const [orders, setOrders] = useState<{ asBuyer: any[]; asSeller: any[] }>({ asBuyer: [], asSeller: [] })
  const [loading, setLoading] = useState(true)
  const [disputeOrder, setDisputeOrder] = useState<any>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    setLoading(true)
    const { data } = await api<{ orders: { asBuyer: any[]; asSeller: any[] } }>('/api/orders/list')
    if (data?.orders) setOrders(data.orders)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); return }
    reload()
  }, [user, setAuthModalOpen])

  const acknowledge = async (orderId: string) => {
    setBusy(true)
    const { error } = await api('/api/orders/acknowledge', { method: 'POST', body: { orderId } })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.success('Receipt acknowledged', { description: 'The seller payout has been triggered.' })
    reload()
  }

  const pay = async (orderId: string) => {
    setBusy(true)
    const { data, error } = await api<{ authorizationUrl: string }>('/api/payments/initiate', { method: 'POST', body: { orderId } })
    setBusy(false)
    if (error) { toast.error(error); return }
    if (data?.authorizationUrl) window.location.href = data.authorizationUrl
  }

  const submitDispute = async () => {
    if (!disputeOrder) return
    if (!disputeReason) { toast.error('Please describe the issue'); return }
    setBusy(true)
    const { error } = await api('/api/orders/dispute', { method: 'POST', body: { orderId: disputeOrder.id, reason: disputeReason } })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.success('Dispute submitted', { description: 'The admin will review and contact you.' })
    setDisputeOrder(null)
    setDisputeReason('')
    reload()
  }

  const messageSeller = async (sellerId: string, reference: string) => {
    if (!user) return
    const { data, error } = await api('/api/messages/conversations', {
      method: 'POST',
      body: { otherUserId: sellerId, subject: `Order ${reference}`, body: `Hi, regarding order ${reference}…` },
    })
    if (error) { toast.error(error); return }
    setView({ name: 'inboxThread', conversationId: data.conversationId })
  }

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Please sign in.</div>
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-3">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Your Orders</span>
      </div>

      <h1 className="text-2xl font-bold mb-4">Your Orders</h1>

      <Tabs defaultValue="buyer">
        <TabsList>
          <TabsTrigger value="buyer">Purchases ({orders.asBuyer.length})</TabsTrigger>
          <TabsTrigger value="seller">Sales ({orders.asSeller.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="buyer" className="mt-4 space-y-3">
          {orders.asBuyer.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-lg">
              <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-bold">No purchases yet</p>
              <p className="text-sm text-muted-foreground mb-3">Browse the marketplace to find items.</p>
              <Button onClick={() => setView({ name: 'home' })}>Start Shopping</Button>
            </div>
          ) : (
            orders.asBuyer.map((o) => <BuyerOrderCard key={o.id} order={o} onAck={() => acknowledge(o.id)} onDispute={() => setDisputeOrder(o)} onMessage={() => messageSeller(o.sellerId, o.reference)} onPay={() => pay(o.id)} busy={busy} />)
          )}
        </TabsContent>

        <TabsContent value="seller" className="mt-4 space-y-3">
          {orders.asSeller.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-lg">
              <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-bold">No sales yet</p>
              <p className="text-sm text-muted-foreground mb-3">Set up your storefront to start selling.</p>
              <Button onClick={() => setView({ name: 'storefront' })}>View Storefront</Button>
            </div>
          ) : (
            orders.asSeller.map((o) => <SellerOrderCard key={o.id} order={o} onMessage={() => messageSeller(o.buyerId, o.reference)} />)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!disputeOrder} onOpenChange={(o) => !o && setDisputeOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute this order</DialogTitle>
            <DialogDescription>
              Use this only if you did not receive the item, received the wrong item, or the service was not rendered. The admin will review your case and may issue a refund.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>What went wrong?</Label>
            <Textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOrder(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDispute} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'completed' ? 'bg-green-600 text-white'
    : status === 'disputed' ? 'bg-red-600 text-white'
    : status === 'acknowledged' ? 'bg-blue-600 text-white'
    : status === 'refunded' ? 'bg-slate-600 text-white'
    : 'bg-amber-500 text-white'
  return <Badge className={cls + ' capitalize'}>{status.replace('_', ' ')}</Badge>
}

function BuyerOrderCard({ order, onAck, onDispute, onMessage, onPay, busy }: { order: any; onAck: () => void; onDispute: () => void; onMessage: () => void; onPay: () => void; busy: boolean }) {
  const { setView } = useStore()
  const cover = order.product?.media?.[0]
  return (
    <div className="bg-card border rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => setView({ name: 'product', id: order.productId })} className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
          {cover ? <img src={cover.url} alt="" className="w-full h-full object-cover" /> : <Package className="w-8 h-8 m-6 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <button onClick={() => setView({ name: 'product', id: order.productId })} className="font-bold text-sm hover:underline text-left">
                {order.product?.title}
              </button>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sold by {order.seller?.fullName} · {new Date(order.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">Order ref: {order.reference}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            <span className="font-bold text-primary">₦{order.totalAmount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">({order.quantity} × ₦{order.unitPrice.toLocaleString()})</span>
            {order.deliveryAddress && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.deliveryAddress}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={onMessage}>
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Message Seller
            </Button>
            {order.status === 'pending' && (
              <Button size="sm" className="bg-primary" onClick={onPay} disabled={busy}>
                Pay ₦{order.totalAmount.toLocaleString()}
              </Button>
            )}
            {(order.status === 'paid' || order.status === 'delivered') && !order.acknowledged && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onAck} disabled={busy}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Acknowledge Receipt
                </Button>
                <Button size="sm" variant="destructive" onClick={onDispute} disabled={busy}>
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Dispute
                </Button>
              </>
            )}
            {order.acknowledged && (
              <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Receipt acknowledged — payout released</span>
            )}
            {order.status === 'disputed' && (
              <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Dispute under admin review</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SellerOrderCard({ order, onMessage }: { order: any; onMessage: () => void }) {
  const { setView } = useStore()
  const cover = order.product?.media?.[0]
  return (
    <div className="bg-card border rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => setView({ name: 'product', id: order.productId })} className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
          {cover ? <img src={cover.url} alt="" className="w-full h-full object-cover" /> : <Package className="w-8 h-8 m-6 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <button onClick={() => setView({ name: 'product', id: order.productId })} className="font-bold text-sm hover:underline text-left">
                {order.product?.title}
              </button>
              <p className="text-xs text-muted-foreground mt-0.5">
                Buyer: {order.buyer?.fullName} · {new Date(order.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">Order ref: {order.reference}</p>
              {order.deliveryAddress && <p className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Deliver to: {order.deliveryAddress}</p>}
              {order.deliveryNotes && <p className="text-xs italic">"{order.deliveryNotes}"</p>}
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            <span className="font-bold text-primary">₦{order.totalAmount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">your payout: ₦{order.sellerPayout.toLocaleString()} (after 20% charge)</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={onMessage}>
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Message Buyer
            </Button>
            {order.acknowledged && (
              <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Buyer acknowledged — payout ₦{order.sellerPayout.toLocaleString()} processing</span>
            )}
            {!order.acknowledged && order.status !== 'disputed' && (
              <span className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Awaiting buyer acknowledgement</span>
            )}
            {order.status === 'disputed' && (
              <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Buyer disputed — admin reviewing</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
