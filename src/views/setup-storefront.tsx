'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight, Store, ShieldCheck, Banknote, Phone, Mail, Loader2, ScrollText,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export function SetupStorefrontPage() {
  const { user, setView, setAuthModalOpen } = useStore()
  const [agreement, setAgreement] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showAgreement, setShowAgreement] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', type: 'both',
    bankName: '', accountName: '', accountNumber: '', phoneNumber: '', contactEmail: '',
  })

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); return }
    (async () => {
      // Check existing storefront first
      const sf = await api<{ storefront: any }>('/api/storefront/me')
      if (sf.data?.storefront) {
        toast.info('You already have a storefront')
        setView({ name: 'storefront' })
        return
      }
      const ag = await api<{ agreement: any }>('/api/agreement')
      setAgreement(ag.data?.agreement)
      // Pre-fill contact email & phone from user
      setForm((f) => ({ ...f, contactEmail: user.email }))
      setLoading(false)
    })()
  }, [user, setAuthModalOpen, setView])

  const submit = async () => {
    if (!agreement) { toast.error('Agreement not loaded'); return }
    if (!form.name || !form.description || !form.bankName || !form.accountName || !form.accountNumber || !form.phoneNumber || !form.contactEmail) {
      toast.error('Please fill in all fields')
      return
    }
    if (!accepted) {
      toast.error('You must read and accept the seller agreement')
      return
    }
    setBusy(true)
    const { data, error } = await api('/api/storefront/setup', {
      method: 'POST',
      body: { ...form, agreementId: agreement.id, agreementAccepted: accepted },
    })
    setBusy(false)
    if (error) { toast.error('Setup failed', { description: error }); return }
    toast.success('Storefront created!', {
      description: 'You can now start listing products and services.',
    })
    setView({ name: 'storefront' })
  }

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Please sign in.</div>
  }

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
        <span className="text-foreground font-medium">Set up Storefront</span>
      </div>

      <div className="bg-primary text-primary-foreground rounded-lg p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Set up your Storefront</h1>
            <p className="text-sm text-white/80">Reach thousands of students with your products and services.</p>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 sm:p-6 space-y-4">
        {/* Storefront info */}
        <div>
          <h2 className="font-bold text-sm mb-2 flex items-center gap-1.5"><Store className="w-4 h-4 text-primary" /> Storefront Information</h2>
          <div className="space-y-3">
            <div>
              <Label>Storefront Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chioma's Campus Kitchen" />
            </div>
            <div>
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe what you sell or services you offer…" />
            </div>
            <div>
              <Label>What do you offer?</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">Products only</SelectItem>
                  <SelectItem value="services">Services only</SelectItem>
                  <SelectItem value="both">Both products & services</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted/50 border rounded text-xs text-muted-foreground">
              Food and drink sales aren't currently permitted on UNI MART — see our <button type="button" className="text-primary underline" onClick={() => setView({ name: 'campus-safety' })}>Campus Safety Policy</button> for the full list of what's allowed.
            </div>
          </div>
        </div>

        {/* Payout details */}
        <div>
          <h2 className="font-bold text-sm mb-2 flex items-center gap-1.5"><Banknote className="w-4 h-4 text-primary" /> Payout & Contact Details</h2>
          <p className="text-xs text-muted-foreground mb-3">Your 80% share of each sale will be sent to this bank account after the buyer acknowledges receipt.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Bank Name <span className="text-destructive">*</span></Label>
              <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. Access Bank" />
            </div>
            <div>
              <Label>Account Name <span className="text-destructive">*</span></Label>
              <Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} placeholder="e.g. Okafor Chioma" />
            </div>
            <div>
              <Label>Account Number <span className="text-destructive">*</span></Label>
              <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/[^0-9]/g, '') })} placeholder="10-digit account number" maxLength={10} />
            </div>
            <div>
              <Label>Phone Number <span className="text-destructive">*</span></Label>
              <Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="e.g. 08012345678" />
            </div>
            <div className="sm:col-span-2">
              <Label>Contact Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="you@student.unimart.ng" />
            </div>
          </div>
        </div>

        {/* Agreement */}
        <div>
          <h2 className="font-bold text-sm mb-2 flex items-center gap-1.5"><ScrollText className="w-4 h-4 text-primary" /> Seller Agreement</h2>
          <div className="bg-muted/50 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{agreement?.title}</p>
                <p className="text-xs text-muted-foreground">Version {agreement?.version} · {agreement?.serviceChargePercent}% service charge</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAgreement(true)}>Read full agreement</Button>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded p-2 mb-2 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>By accepting, you agree to the {agreement?.serviceChargePercent}% service charge, the buyer-acknowledgement payout rule, and admin silent oversight of your messages.</span>
          </div>
          <label className="flex items-start gap-2 cursor-pointer p-3 border rounded">
            <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">I have read and agree to the Seller Agreement</p>
              <p className="text-xs text-muted-foreground">You confirm that you understand the {agreement?.serviceChargePercent}% service charge, the buyer-acknowledgement payout rule, and consent to admin oversight of your inbox messages.</p>
            </div>
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setView({ name: 'home' })}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !accepted} size="lg">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up…</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Create Storefront</>}
          </Button>
        </div>
      </div>

      {/* Full agreement modal */}
      {showAgreement && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAgreement(false)}>
          <div className="bg-card rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b sticky top-0 bg-card flex items-center justify-between">
              <div>
                <h2 className="font-bold">{agreement?.title}</h2>
                <p className="text-xs text-muted-foreground">Version {agreement?.version}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAgreement(false)}>Close</Button>
            </div>
            <div className="p-4 whitespace-pre-line text-sm">{agreement?.body}</div>
          </div>
        </div>
      )}
    </div>
  )
}
