'use client'

import { useEffect, useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Store, Upload, X, ImageIcon, Video, Volume2, Loader2, AlertCircle, CheckCircle2, ChevronRight, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'

type MediaItem = { type: 'image' | 'video' | 'audio'; url: string; name: string }

export function SellPage() {
  const { user, setView, setAuthModalOpen } = useStore()
  const [storefront, setStorefront] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState({
    title: '', description: '', price: '', kind: 'product', condition: 'new', stock: '1',
    categoryId: '', newCategoryName: '', deliveryNotes: '',
  })
  const [media, setMedia] = useState<MediaItem[]>([])
  const fileRefs = { image: useRef<HTMLInputElement>(null), video: useRef<HTMLInputElement>(null), audio: useRef<HTMLInputElement>(null) }

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); return }
    (async () => {
      setLoading(true)
      const [sf, cats] = await Promise.all([
        api<{ storefront: any }>('/api/storefront/me'),
        api<{ categories: any[] }>('/api/categories'),
      ])
      if (sf.data?.storefront) setStorefront(sf.data.storefront)
      if (cats.data?.categories) setCategories(cats.data.categories)
      setLoading(false)
    })()
  }, [user, setAuthModalOpen])

  const onPickFile = (type: 'image' | 'video' | 'audio', file: File | undefined) => {
    if (!file) return
    const caps: Record<string, number> = { image: 8, video: 25, audio: 25 }
    if (file.size > caps[type] * 1024 * 1024) {
      toast.error('File too large', { description: `Max ${caps[type]}MB for ${type}` })
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      // Validate with upload endpoint
      const { data, error } = await api<{ url: string }>('/api/upload', { method: 'POST', body: { type, dataUrl } })
      if (error) { toast.error('Upload failed', { description: error }); return }
      setMedia((m) => [...m, { type, url: data!.url, name: file.name }])
      toast.success(`${type} uploaded`)
    }
    reader.readAsDataURL(file)
  }

  const removeMedia = (i: number) => setMedia((m) => m.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!storefront) { toast.error('Set up your storefront first'); return }
    if (!form.title || !form.description || !form.price || !form.kind) {
      toast.error('Title, description, price and type are required')
      return
    }
    if (!form.categoryId && !form.newCategoryName) {
      toast.error('Please select a category or create a new one')
      return
    }
    setBusy(true)
    const { data, error } = await api('/api/products/create', {
      method: 'POST',
      body: {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock) || 1,
        media: media.map((m) => ({ type: m.type, url: m.url })),
      },
    })
    setBusy(false)
    if (error) { toast.error('Failed to list', { description: error }); return }
    toast.success('Listing published!', { description: data?.message })
    setView({ name: 'storefront' })
  }

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Please sign in to sell.</div>
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!storefront) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert>
          <Store className="w-4 h-4" />
          <AlertTitle>You need a storefront to sell</AlertTitle>
          <AlertDescription>
            Set up your storefront, sign the seller agreement, and provide your bank details to start selling.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => setView({ name: 'setup-storefront' })}>
          Set up Storefront <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    )
  }

  if (storefront.status !== 'active') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Storefront not active</AlertTitle>
          <AlertDescription>
            Your storefront is currently <strong>{storefront.status.replace('_', ' ')}</strong>. You can't list items until an admin approves it.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={() => setView({ name: 'storefront' })} className="hover:text-primary">Storefront</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">New Listing</span>
      </div>

      <h1 className="text-2xl font-bold mb-1">List a Product or Service</h1>
      <p className="text-sm text-muted-foreground mb-4">Reach thousands of ABUAD students. Remember the 20% service charge applies on each sale.</p>

      <div className="bg-card border rounded-lg p-4 sm:p-6 space-y-4">
        <div>
          <Label>What are you selling? <span className="text-destructive">*</span></Label>
          <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="product">A Product (physical item)</SelectItem>
              <SelectItem value="service">A Service (delivery, repair, notes, etc.)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.kind === 'product' ? 'e.g. iPhone 11 (128GB, fairly used)' : 'e.g. Same-hostel delivery (under 1km)'} />
          <p className="text-xs text-muted-foreground mt-1">Be specific — include brand, model, size or scope of service.</p>
        </div>

        <div>
          <Label htmlFor="desc">Description <span className="text-destructive">*</span></Label>
          <Textarea
            id="desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Describe condition, what's included, delivery options, turnaround time, etc."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="price">Price (₦) <span className="text-destructive">*</span></Label>
            <Input id="price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 1500" />
            <p className="text-xs text-muted-foreground mt-1">You receive {(100 - 20)}% after the 20% service charge.</p>
          </div>
          {form.kind === 'product' && (
            <>
              <div>
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Brand New</SelectItem>
                    <SelectItem value="fairly_used">Fairly Used</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" type="number" min="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </>
          )}
        </div>

        {/* Category selection */}
        <div>
          <Label>Category <span className="text-destructive">*</span></Label>
          <div className="space-y-2 mt-1">
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v, newCategoryName: '' })}>
              <SelectTrigger><SelectValue placeholder="Pick an existing category" /></SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.requiresApproval && '⚠️ (food — needs approval)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-dashed" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 border-t border-dashed" />
            </div>
            <Input
              value={form.newCategoryName}
              onChange={(e) => setForm({ ...form, newCategoryName: e.target.value, categoryId: '' })}
              placeholder="Create a new category (e.g. 'Catering Services')"
            />
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-500" />
              <span>New categories appear in the public menu automatically once 2 or more students list under them.</span>
            </p>
          </div>
        </div>

        {/* Media uploads */}
        <div>
          <Label>Media (photos, videos & audio)</Label>
          <p className="text-xs text-muted-foreground mb-2">Upload clear photos of the actual product, a video demo, or an audio description. Max 8MB per image, 25MB per video/audio.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <input ref={fileRefs.image} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile('image', e.target.files?.[0])} />
            <input ref={fileRefs.video} type="file" accept="video/*" className="hidden" onChange={(e) => onPickFile('video', e.target.files?.[0])} />
            <input ref={fileRefs.audio} type="file" accept="audio/*" className="hidden" onChange={(e) => onPickFile('audio', e.target.files?.[0])} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRefs.image.current?.click()}>
              <ImageIcon className="w-4 h-4 mr-1" /> Add Photo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRefs.video.current?.click()}>
              <Video className="w-4 h-4 mr-1" /> Add Video
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRefs.audio.current?.click()}>
              <Volume2 className="w-4 h-4 mr-1" /> Add Audio
            </Button>
          </div>
          {media.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative aspect-square bg-muted rounded-md overflow-hidden border">
                  {m.type === 'image' ? (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  ) : m.type === 'video' ? (
                    <video src={m.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                      <Volume2 className="w-6 h-6 mb-1" />
                      <p className="text-[10px] truncate w-full text-center">{m.name}</p>
                    </div>
                  )}
                  <button onClick={() => removeMedia(i)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80">
                    <X className="w-3 h-3" />
                  </button>
                  <Badge className="absolute bottom-1 left-1 text-[10px] capitalize">{m.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="delivery">Delivery / Pickup Notes (optional)</Label>
          <Textarea
            id="delivery"
            value={form.deliveryNotes}
            onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
            rows={2}
            placeholder="e.g. Free delivery within ABC hostel; pickup at College A entrance."
          />
        </div>

        <div className="bg-muted/50 p-3 rounded text-xs flex gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">By listing, you agree to the Seller Agreement</p>
            <p className="text-muted-foreground">You'll be paid only after the buyer acknowledges receipt. The 20% service charge will be deducted automatically.</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setView({ name: 'storefront' })}>Cancel</Button>
          <Button onClick={submit} disabled={busy} size="lg">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing…</> : 'Publish Listing'}
          </Button>
        </div>
      </div>
    </div>
  )
}
