'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { ProductCard } from '@/components/product-card'
import { api } from '@/lib/api'
import { Store, Package, MessageSquare, ChevronRight, ShieldCheck, Edit, Loader2, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { ReferralSummaryCard } from '@/components/referral-summary-card'
import { EmailVerificationBanner } from '@/components/email-verification-banner'
import { DepartmentSelect } from '@/components/department-select'

export function ProfilePage() {
  const { user, setUser, setView } = useStore()
  const [storefront, setStorefront] = useState<any>(null)
  const [orders, setOrders] = useState<{ asBuyer: any[]; asSeller: any[] }>({ asBuyer: [], asSeller: [] })
  const [loading, setLoading] = useState(true)

  // Edit-profile dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', department: '', level: '', profilePicture: '' })

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      api<{ storefront: any }>('/api/storefront/me'),
      api<{ orders: any }>('/api/orders/list'),
    ]).then(([sf, ords]) => {
      if (cancelled) return
      if (sf.data?.storefront) setStorefront(sf.data.storefront)
      if (ords.data?.orders) setOrders(ords.data.orders)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const openEdit = () => {
    if (!user) return
    setForm({
      fullName: user.fullName || '',
      phone: (user as any).phone || '',
      department: user.department || '',
      level: user.level || '',
      profilePicture: user.profilePicture || '',
    })
    setEditOpen(true)
  }

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 1.4 * 1024 * 1024) { toast.error('Image too large (max ~1.4MB)'); return }
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, profilePicture: String(reader.result || '') }))
    reader.onerror = () => toast.error('Could not read that image')
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    setSaving(true)
    const { data, error } = await api<{ user: any }>('/api/auth/me', {
      method: 'PUT',
      body: {
        fullName: form.fullName,
        phone: form.phone,
        department: form.department,
        level: form.level,
        profilePicture: form.profilePicture,
      },
    })
    setSaving(false)
    if (error) { toast.error(error); return }
    if (data?.user) setUser(data.user)
    setEditOpen(false)
    toast.success('Profile updated')
  }

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
                <Button size="sm" variant="outline" onClick={openEdit}>
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
          <div className="text-2xl font-bold text-primary">
            {loading ? <Skeleton className="h-7 w-10" /> : orders.asBuyer.length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Sales</p>
          <div className="text-2xl font-bold text-primary">
            {loading ? <Skeleton className="h-7 w-10" /> : orders.asSeller.length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Listings</p>
          <div className="text-2xl font-bold text-primary">
            {loading ? <Skeleton className="h-7 w-10" /> : (storefront?.products?.length || 0)}
          </div>
        </div>
      </div>

      {loading ? (
        <div>
          <h2 className="font-bold text-lg mb-2">Your Listings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        </div>
      ) : storefront ? (
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
      ) : null}

      {/* Edit-profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Update your details. Your email and matric number are identity fields and can&apos;t be changed here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-16 h-16">
                <AvatarImage src={form.profilePicture || undefined} />
                <AvatarFallback className="text-xl">{(form.fullName || user.fullName).charAt(0)}</AvatarFallback>
              </Avatar>
              <label className="text-sm cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-accent transition">
                <Camera className="w-4 h-4" /> Change photo
                <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
              </label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-name">Full name</Label>
              <Input id="pf-name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-phone">WhatsApp number</Label>
              <Input id="pf-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 0803 000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pf-dept">Department</Label>
                <DepartmentSelect id="pf-dept" value={form.department} onChange={(v) => setForm((f) => ({ ...f, department: v }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pf-level">Level</Label>
                <Input id="pf-level" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} placeholder="100" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveProfile} disabled={saving} className="cta-gradient border-0">
              {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
