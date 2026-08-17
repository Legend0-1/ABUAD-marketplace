'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Star, ShoppingCart, Zap, ShieldCheck, MapPin, ChevronRight, MessageSquare,
  Flag, ThumbsUp, Reply, Send, Play, Volume2, AlertCircle, Loader2, CheckCircle2, Store, Package,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'

export function ProductPage({ productId }: { productId: string }) {
  const { setView, addToCart, user, setAuthModalOpen, setCartOpen } = useStore()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [qty, setQty] = useState(1)
  const [activeMedia, setActiveMedia] = useState(0)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [newComment, setNewComment] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportForm, setReportForm] = useState({ reason: '', details: '' })

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await api<{ product: any; isOwner: boolean }>(`/api/products/${productId}`)
      if (data?.product) {
        setProduct(data.product)
        setIsOwner(data.isOwner)
      }
      setLoading(false)
    })()
  }, [productId])

  const onAddToCart = () => {
    if (!user) { setAuthModalOpen(true); return }
    const cover = product.media?.find((m: any) => m.type === 'image') || product.media?.[0]
    addToCart({ productId: product.id, title: product.title, price: product.price, quantity: qty, sellerId: product.sellerId, image: cover?.url })
    toast.success('Added to cart', { description: `${qty} × ${product.title}` })
  }

  const onBuyNow = () => {
    if (!user) { setAuthModalOpen(true); return }
    const cover = product.media?.find((m: any) => m.type === 'image') || product.media?.[0]
    addToCart({ productId: product.id, title: product.title, price: product.price, quantity: qty, sellerId: product.sellerId, image: cover?.url })
    setCartOpen(true)
  }

  const onMessageSeller = async () => {
    if (!user) { setAuthModalOpen(true); return }
    if (isOwner) { toast.info('This is your own listing'); return }
    // Open conversation via POST /api/messages/conversations
    const { data, error } = await api<{ conversationId: string }>('/api/messages/conversations', {
      method: 'POST',
      body: { otherUserId: product.sellerId, subject: `About: ${product.title}`, body: `Hi! I'm interested in your listing "${product.title}". Is it still available?` },
    })
    if (error) { toast.error(error); return }
    toast.success('Started a conversation with the seller')
    setView({ name: 'inboxThread', conversationId: data.conversationId })
  }

  const onBuyService = async () => {
    if (!user) { setAuthModalOpen(true); return }
    if (isOwner) { toast.info('This is your own listing'); return }
    const { data, error } = await api('/api/orders/create', {
      method: 'POST',
      body: { productId: product.id, quantity: 1 },
    })
    if (error) { toast.error(error); return }
    toast.success('Service booked', { description: 'The seller will message you with next steps.' })
    setView({ name: 'orders' })
  }

  const submitReview = async () => {
    if (!user) { setAuthModalOpen(true); return }
    if (!newReview.comment) { toast.error('Please write a comment'); return }
    const { error } = await api('/api/reviews/create', {
      method: 'POST',
      body: { productId: product.id, rating: newReview.rating, comment: newReview.comment },
    })
    if (error) { toast.error(error); return }
    toast.success('Review posted')
    setNewReview({ rating: 5, comment: '' })
    // Reload
    const { data } = await api<{ product: any }>(`/api/products/${productId}`)
    if (data?.product) setProduct(data.product)
  }

  const submitComment = async () => {
    if (!user) { setAuthModalOpen(true); return }
    if (!newComment) return
    const { error } = await api('/api/comments/create', {
      method: 'POST',
      body: { productId: product.id, body: newComment },
    })
    if (error) { toast.error(error); return }
    toast.success('Comment posted')
    setNewComment('')
    const { data } = await api<{ product: any }>(`/api/products/${productId}`)
    if (data?.product) setProduct(data.product)
  }

  const submitReport = async () => {
    if (!user) { setAuthModalOpen(true); return }
    if (!reportForm.reason) { toast.error('Please pick a reason'); return }
    const { error } = await api('/api/reports/create', {
      method: 'POST',
      body: { reportedUserId: product.sellerId, productId: product.id, reason: reportForm.reason, details: reportForm.details },
    })
    if (error) { toast.error(error); return }
    toast.success('Report submitted', { description: 'The admin has been notified.' })
    setReportOpen(false)
    setReportForm({ reason: '', details: '' })
  }

  if (loading) {
    return (
      <div className="max-w-[1500px] mx-auto px-3 sm:px-4 py-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-5 aspect-square rounded-lg" />
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-[1500px] mx-auto px-4 py-16 text-center">
        <p className="text-xl font-bold">Listing not found</p>
        <Button className="mt-4" onClick={() => setView({ name: 'home' })}>Back to home</Button>
      </div>
    )
  }

  const active = product.media?.[activeMedia]
  const rating = product.rating || 0
  const reviewCount = product._count?.reviews ?? product.reviewCount ?? 0

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 flex-wrap">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={() => setView({ name: 'category', slug: product.category.slug, categoryName: product.category.name })} className="hover:text-primary">{product.category.name}</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium line-clamp-1">{product.title}</span>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Media gallery */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-card border rounded-lg overflow-hidden aspect-square flex items-center justify-center">
            {active ? (
              active.type === 'image' ? (
                <img src={active.url} alt={product.title} className="w-full h-full object-contain" />
              ) : active.type === 'video' ? (
                <video src={active.url} controls className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center text-center p-8">
                  <Volume2 className="w-12 h-12 text-primary mb-3" />
                  <audio src={active.url} controls className="w-full max-w-md" />
                  <p className="text-xs text-muted-foreground mt-2">Audio description</p>
                </div>
              )
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p>No media</p>
              </div>
            )}
          </div>
          {product.media && product.media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              {product.media.map((m: any, i: number) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMedia(i)}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 shrink-0 ${i === activeMedia ? 'border-primary' : 'border-transparent'}`}
                >
                  {m.type === 'image' ? (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  ) : m.type === 'video' ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center"><Play className="w-5 h-5" /></div>
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center"><Volume2 className="w-5 h-5" /></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="lg:col-span-4 space-y-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{product.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm">
              {rating > 0 ? (
                <>
                  <span className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`} />
                    ))}
                  </span>
                  <span className="text-muted-foreground">{rating} · {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                </>
              ) : (
                <span className="text-muted-foreground italic text-sm">No reviews yet — be the first!</span>
              )}
            </div>
          </div>

          <div className="border-t border-b py-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-primary">₦{product.price.toLocaleString()}</span>
              {product.kind === 'service' && <span className="text-sm text-muted-foreground">/ service</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {product.kind === 'product'
                ? `In stock: ${product.stock} available`
                : 'Service available on demand'}
            </p>
          </div>

          <div>
            <p className="text-sm font-bold mb-1">Description</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
          </div>

          {product.kind === 'product' && product.condition && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Condition:</span>
              <Badge variant="secondary" className="capitalize">{product.condition.replace('_', ' ')}</Badge>
            </div>
          )}

          {product.deliveryNotes && (
            <div className="bg-muted/50 rounded p-2 text-xs">
              <p className="font-bold">Delivery notes</p>
              <p className="text-muted-foreground">{product.deliveryNotes}</p>
            </div>
          )}

          {!isOwner && (
            <div className="space-y-2 pt-2">
              {product.kind === 'product' && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Qty:</Label>
                  <Button variant="outline" size="sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
                  <span className="w-8 text-center font-bold">{qty}</span>
                  <Button variant="outline" size="sm" onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</Button>
                </div>
              )}
              {product.kind === 'product' ? (
                <>
                  <Button className="w-full" size="lg" variant="outline" onClick={onAddToCart}>
                    <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
                  </Button>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={onBuyNow}>
                    <Zap className="w-4 h-4 mr-2" /> Buy Now
                  </Button>
                </>
              ) : (
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={onBuyService}>
                  <Zap className="w-4 h-4 mr-2" /> Book this Service
                </Button>
              )}
              <Button variant="outline" className="w-full" size="lg" onClick={onMessageSeller}>
                <MessageSquare className="w-4 h-4 mr-2" /> Message Seller
              </Button>
            </div>
          )}

          {isOwner && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
              <p className="font-bold text-primary">This is your listing</p>
              <p className="text-muted-foreground text-xs mt-1">Manage it from your Storefront dashboard.</p>
              <Button size="sm" className="mt-2" onClick={() => setView({ name: 'storefront' })}>Go to Storefront</Button>
            </div>
          )}

          <div className="bg-green-50 dark:bg-green-950/30 border border-green-500/30 rounded-lg p-3 text-xs flex gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-700 dark:text-green-400">Buyer Protection</p>
              <p className="text-green-700/80 dark:text-green-400/80">Your payment is held until you acknowledge receipt. If something's wrong, you can dispute and the admin will mediate.</p>
            </div>
          </div>
        </div>

        {/* Seller card */}
        <div className="lg:col-span-3">
          <div className="bg-card border rounded-lg p-4 space-y-3 sticky top-32">
            <p className="text-xs font-bold text-muted-foreground uppercase">Sold by</p>
            <button
              onClick={() => setView({ name: 'storefrontView', ownerId: product.sellerId })}
              className="flex items-center gap-3 w-full text-left hover:bg-muted/50 -m-2 p-2 rounded"
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={product.seller.profilePicture || undefined} />
                <AvatarFallback>{product.seller.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{product.storefront.name}</p>
                <p className="text-xs text-muted-foreground truncate">{product.seller.fullName}</p>
              </div>
            </button>
            <div className="text-xs space-y-1">
              <p className="flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{product.storefront.rating?.toFixed?.(1) || 'New'} seller rating</span>
              </p>
              <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {product.seller.department}</p>
              <p className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Verified ABUAD student</p>
              <p className="flex items-center gap-1.5"><Store className="w-3 h-3" /> {product.seller.level} Level</p>
            </div>
            {product.category?.requiresApproval && (
              <Badge className="bg-verified text-verified-foreground w-full justify-center">
                <ShieldCheck className="w-3 h-3 mr-1" /> Admin-Verified Seller
              </Badge>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setView({ name: 'storefrontView', ownerId: product.sellerId })}>
              Visit Storefront
            </Button>
            {!isOwner && (
              <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => setReportOpen(true)}>
                <Flag className="w-3 h-3 mr-1" /> Report Seller
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Reviews & Comments */}
      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold mb-3">Reviews ({reviewCount})</h2>
          {user && !isOwner && (
            <div className="bg-card border rounded-lg p-3 mb-3 space-y-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} onClick={() => setNewReview({ ...newReview, rating: i })}>
                    <Star className={`w-6 h-6 ${i <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`} />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Share your honest experience with this product/service…"
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                rows={3}
              />
              <Button onClick={submitReview} size="sm">Post Review</Button>
            </div>
          )}
          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-2">
              {product.reviews.map((r: any) => (
                <div key={r.id} className="bg-card border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={r.user.profilePicture || undefined} />
                      <AvatarFallback className="text-xs">{r.user.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold">{r.user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{r.user.department} · {new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="ml-auto flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                      ))}
                    </span>
                  </div>
                  <p className="text-sm">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No reviews yet. Be the first to review!</p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3">Comments & Questions</h2>
          {user && (
            <div className="bg-card border rounded-lg p-3 mb-3 flex gap-2">
              <Input
                placeholder="Ask a question or leave a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitComment() }}
              />
              <Button onClick={submitComment} size="icon"><Send className="w-4 h-4" /></Button>
            </div>
          )}
          {product.comments && product.comments.length > 0 ? (
            <div className="space-y-2">
              {product.comments.map((c: any) => (
                <div key={c.id} className="bg-card border rounded-lg p-3 flex gap-2">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={c.user.profilePicture || undefined} />
                    <AvatarFallback className="text-xs">{c.user.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-bold">{c.user.fullName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{new Date(c.createdAt).toLocaleString()}</span>
                    </p>
                    <p className="text-sm mt-0.5">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No comments yet.</p>
          )}
        </div>
      </div>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this seller</DialogTitle>
            <DialogDescription>
              Reports are confidential and reviewed by the admin. False reports may result in account action against you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason</Label>
              <Select value={reportForm.reason} onValueChange={(v) => setReportForm({ ...reportForm, reason: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fraud">Suspected fraud / scam</SelectItem>
                  <SelectItem value="fake_product">Fake or counterfeit product</SelectItem>
                  <SelectItem value="misrepresented">Item not as described</SelectItem>
                  <SelectItem value="harassment">Harassment or abuse</SelectItem>
                  <SelectItem value="prohibited">Prohibited item (alcohol, drugs, weapons, etc.)</SelectItem>
                  <SelectItem value="impersonation">Impersonating another student</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Details</Label>
              <Textarea
                placeholder="Tell us what happened…"
                value={reportForm.details}
                onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReport}>Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
