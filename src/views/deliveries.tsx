'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronRight, Truck, Plus, Loader2, MessageSquare, CheckCircle2, X, Send, ShieldCheck, Star } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  pending_hr: 'With HR — awaiting assignment',
  awaiting_partner: 'Awaiting partner response',
  in_progress: 'In progress',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
}
const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'bg-amber-500 text-white',
  pending_hr: 'bg-blue-500 text-white',
  awaiting_partner: 'bg-blue-500 text-white',
  in_progress: 'bg-primary text-primary-foreground',
  completed: 'bg-verified text-verified-foreground',
  disputed: 'bg-destructive text-white',
  cancelled: 'bg-gray-400 text-white',
}

export function DeliveriesPage() {
  const { setView, user, setAuthModalOpen } = useStore()
  const [asCustomer, setAsCustomer] = useState<any[]>([])
  const [asPartner, setAsPartner] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [thread, setThread] = useState<any | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await api<{ asCustomer: any[]; asPartner: any[] }>('/api/delivery/requests/list')
    setAsCustomer(data?.asCustomer || [])
    setAsPartner(data?.asPartner || [])
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Truck className="w-10 h-10 mx-auto text-primary mb-3" />
        <p className="text-muted-foreground mb-4">Sign in to request or manage deliveries.</p>
        <Button onClick={() => setAuthModalOpen(true)}>Sign In</Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Deliveries</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Deliveries</h1>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-1"><Plus className="w-4 h-4" /> Request Delivery</Button>
      </div>

      {formOpen && <NewRequestForm onClose={() => setFormOpen(false)} onCreated={() => { setFormOpen(false); load() }} />}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="customer">
          <TabsList>
            <TabsTrigger value="customer">As Customer ({asCustomer.length})</TabsTrigger>
            {asPartner.length > 0 && <TabsTrigger value="partner">As Partner ({asPartner.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="customer" className="space-y-2 mt-3">
            {asCustomer.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No delivery requests yet.</p>}
            {asCustomer.map((r) => (
              <RequestCard key={r.id} request={r} role="customer" onOpenThread={() => setThread(r)} onRefresh={load} />
            ))}
          </TabsContent>

          <TabsContent value="partner" className="space-y-2 mt-3">
            {asPartner.map((r) => (
              <RequestCard key={r.id} request={r} role="partner" onOpenThread={() => setThread(r)} onRefresh={load} />
            ))}
          </TabsContent>
        </Tabs>
      )}

      {thread && <MessageThread request={thread} onClose={() => setThread(null)} />}
    </div>
  )
}

type Partner = {
  id: string
  fullName: string
  profilePicture?: string | null
  deliveryFee: number
  note?: string | null
  trustScore: number
  typeAEligible: boolean
  jobsCount: number
}

function NewRequestForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<'buy_and_deliver' | 'errand_only'>('errand_only')
  const [description, setDescription] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [itemCost, setItemCost] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [partners, setPartners] = useState<Partner[]>([])
  const [flatFee, setFlatFee] = useState(1000)
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [partnerId, setPartnerId] = useState('')

  // Re-fetch partners whenever the job type changes: buy_and_deliver only lists
  // Type-A–eligible partners, so the available set differs.
  useEffect(() => {
    let cancelled = false
    setLoadingPartners(true)
    setPartnerId('')
    api<{ partners: Partner[]; flatFee: number }>('/api/delivery/partners', { query: { type } })
      .then(({ data }) => {
        if (cancelled) return
        setPartners(data?.partners || [])
        if (typeof data?.flatFee === 'number') setFlatFee(data.flatFee)
      })
      .finally(() => { if (!cancelled) setLoadingPartners(false) })
    return () => { cancelled = true }
  }, [type])

  const selected = partners.find((p) => p.id === partnerId)
  const itemCostNum = type === 'buy_and_deliver' ? Number(itemCost) || 0 : 0
  const total = (selected?.deliveryFee || 0) + flatFee + itemCostNum

  const submit = async () => {
    if (!description.trim() || !dropoffLocation.trim()) { toast.error('Fill in all required fields'); return }
    if (type === 'buy_and_deliver' && (!itemCost || Number(itemCost) <= 0)) { toast.error('Item cost is required for buy & deliver'); return }
    if (!partnerId) { toast.error('Please choose a delivery partner'); return }
    setSubmitting(true)
    const { data, error } = await api('/api/delivery/requests/create', {
      method: 'POST',
      body: { type, description, dropoffLocation, itemCost: type === 'buy_and_deliver' ? itemCost : undefined, partnerId },
    })
    if (error) { toast.error(error); setSubmitting(false); return }

    const { data: payData, error: payError } = await api<{ authorizationUrl: string }>(`/api/delivery/requests/${data.request.id}/pay`, { method: 'POST' })
    setSubmitting(false)
    if (payError) { toast.error(payError); return }
    if (payData?.authorizationUrl) window.location.href = payData.authorizationUrl
    onCreated()
  }

  return (
    <div className="bg-card border rounded-lg p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">New Delivery Request</h3>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <Select value={type} onValueChange={(v: any) => setType(v)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="errand_only">Errand only (pick up / drop off something)</SelectItem>
          <SelectItem value="buy_and_deliver">Buy & deliver (partner purchases an item for me)</SelectItem>
        </SelectContent>
      </Select>

      <div className="space-y-1.5">
        <Label className="text-xs">What do you need?</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={type === 'buy_and_deliver' ? 'e.g. Buy a 5kg bag of rice from the campus market' : 'e.g. Pick up my package from the hostel gate and bring it to my room'} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Drop-off location</Label>
        <Input value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} placeholder="e.g. Male Hostel Block C, Room 14" />
      </div>

      {type === 'buy_and_deliver' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Item cost (₦)</Label>
          <Input type="number" value={itemCost} onChange={(e) => setItemCost(e.target.value)} placeholder="What the item costs to buy" />
        </div>
      )}

      {/* Choose a partner (replaces the old "how much will you pay?" input) */}
      <div className="space-y-1.5">
        <Label className="text-xs">Choose a delivery partner</Label>
        {loadingPartners ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading available partners…
          </div>
        ) : partners.length === 0 ? (
          <div className="text-xs text-muted-foreground bg-muted/50 border rounded p-3">
            No delivery partners are available for this option right now. Please check back shortly.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {partners.map((p) => {
              const active = p.id === partnerId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPartnerId(p.id)}
                  className={`w-full text-left flex items-center gap-3 rounded-lg border p-2.5 transition ${active ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-accent/40'}`}
                >
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={p.profilePicture || undefined} />
                    <AvatarFallback>{p.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{p.fullName}</p>
                      {p.typeAEligible && <ShieldCheck className="w-3.5 h-3.5 text-verified shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.jobsCount} job{p.jobsCount === 1 ? '' : 's'}
                      {p.trustScore > 0 && <> · <Star className="w-3 h-3 inline -mt-0.5" /> {p.trustScore}</>}
                      {p.note ? ` · ${p.note}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">₦{p.deliveryFee.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">their fee</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Transparent fee breakdown */}
      {selected && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Partner fee ({selected.fullName})</span><span>₦{selected.deliveryFee.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Platform delivery fee</span><span>₦{flatFee.toLocaleString()}</span></div>
          {type === 'buy_and_deliver' && itemCostNum > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">Item cost</span><span>₦{itemCostNum.toLocaleString()}</span></div>
          )}
          <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total to pay</span><span>₦{total.toLocaleString()}</span></div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {type === 'buy_and_deliver'
          ? "You'll pay the total upfront. Once your chosen partner accepts, the item cost is released to them to make the purchase. The partner's fee is only released once you confirm delivery. The platform fee is non-refundable once a partner accepts."
          : "You'll pay the total upfront, held until you confirm the errand is complete. Your chosen partner is notified immediately to accept the job."}
      </p>

      <Button onClick={submit} disabled={submitting || !partnerId} className="w-full">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Continue to Payment{selected ? ` · ₦${total.toLocaleString()}` : ''}
      </Button>
    </div>
  )
}

function RequestCard({ request, role, onOpenThread, onRefresh }: { request: any; role: 'customer' | 'partner'; onOpenThread: () => void; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false)

  const respond = async (accept: boolean) => {
    setBusy(true)
    const { error } = await api(`/api/delivery/requests/${request.id}/respond`, { method: 'POST', body: { accept } })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.success(accept ? 'Accepted — proceed with the job' : 'Declined')
    onRefresh()
  }

  const confirm = async () => {
    setBusy(true)
    const { data, error } = await api(`/api/delivery/requests/${request.id}/confirm`, { method: 'POST' })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.success('Delivery confirmed', { description: data?.warning || 'Payment released to the partner.' })
    onRefresh()
  }

  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{request.reference}</p>
          <p className="text-sm font-medium mt-0.5">{request.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {request.type === 'buy_and_deliver' ? 'Buy & Deliver' : 'Errand Only'} · Drop-off: {request.dropoffLocation}
          </p>
          {role === 'customer' && request.partner && <p className="text-xs text-muted-foreground">Partner: {request.partner.user.fullName}</p>}
          {role === 'partner' && <p className="text-xs text-muted-foreground">Customer: {request.customer.fullName}</p>}
        </div>
        <Badge className={STATUS_COLOR[request.status]}>{STATUS_LABEL[request.status]}</Badge>
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
        {request.itemCost != null && <span className="price-tag price-tag-outline">Item ₦{request.itemCost.toLocaleString()}</span>}
        <span className="price-tag">Partner fee ₦{request.serviceFee.toLocaleString()}</span>
        {request.platformFee != null && <span className="price-tag price-tag-outline">Platform ₦{request.platformFee.toLocaleString()}</span>}
        {request.totalPaid != null && <span className="text-muted-foreground">Total ₦{request.totalPaid.toLocaleString()}</span>}
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {request.type === 'buy_and_deliver' && ['in_progress', 'completed'].includes(request.status) && (
          <Button size="sm" variant="outline" onClick={onOpenThread} className="gap-1"><MessageSquare className="w-3.5 h-3.5" /> Message</Button>
        )}
        {role === 'partner' && request.status === 'awaiting_partner' && (
          <>
            <Button size="sm" onClick={() => respond(true)} disabled={busy}>Accept</Button>
            <Button size="sm" variant="outline" onClick={() => respond(false)} disabled={busy}>Decline</Button>
          </>
        )}
        {role === 'customer' && request.status === 'in_progress' && (
          <Button size="sm" onClick={confirm} disabled={busy} className="gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Receipt
          </Button>
        )}
      </div>
    </div>
  )
}

function MessageThread({ request, onClose }: { request: any; onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const load = async () => {
    const { data } = await api<{ messages: any[] }>(`/api/delivery/requests/${request.id}/message`)
    setMessages(data?.messages || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [request.id])

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    const { error } = await api(`/api/delivery/requests/${request.id}/message`, { method: 'POST', body: { body } })
    setSending(false)
    if (error) { toast.error(error); return }
    setBody('')
    load()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-md sm:rounded-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b flex items-center justify-between">
          <p className="font-semibold text-sm">{request.reference}</p>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No messages yet.</p>
          ) : messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="font-medium">{m.sender.fullName}:</span> {m.body}
            </div>
          ))}
        </div>
        <div className="p-3 border-t flex gap-2">
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message…" onKeyDown={(e) => e.key === 'Enter' && send()} />
          <Button size="icon" onClick={send} disabled={sending}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  )
}
