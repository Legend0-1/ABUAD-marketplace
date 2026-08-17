'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronRight, Users, Truck, Video, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'

export function HRQueuePage() {
  const { setView, user } = useStore()

  if (!user || (!user.isAdmin && !user.isHR)) {
    return <div className="max-w-lg mx-auto px-4 py-24 text-center text-muted-foreground">Admin or HR access required.</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">HR Dashboard</span>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue"><Truck className="w-4 h-4 mr-1" /> Delivery Queue</TabsTrigger>
          <TabsTrigger value="partners"><Users className="w-4 h-4 mr-1" /> Partners</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4"><DeliveryQueueTab /></TabsContent>
        <TabsContent value="partners" className="mt-4"><PartnersTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function DeliveryQueueTab() {
  const [data, setData] = useState<{ pendingRequests: any[]; activeRequests: any[]; availablePartners: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [chosenPartner, setChosenPartner] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    const { data } = await api<any>('/api/hr/queue')
    setData(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const assign = async (requestId: string) => {
    const partnerId = chosenPartner[requestId]
    if (!partnerId) { toast.error('Pick a partner first'); return }
    setAssigning(requestId)
    const { error } = await api(`/api/hr/requests/${requestId}/assign`, { method: 'POST', body: { partnerId } })
    setAssigning(null)
    if (error) { toast.error(error); return }
    toast.success('Partner assigned')
    load()
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold mb-2">Awaiting Assignment ({data.pendingRequests.length})</h3>
        {data.pendingRequests.length === 0 && <p className="text-sm text-muted-foreground">Nothing in the queue.</p>}
        <div className="space-y-2">
          {data.pendingRequests.map((r) => {
            const eligiblePartners = data.availablePartners.filter((p) => r.type !== 'buy_and_deliver' || p.typeAEligible)
            return (
              <div key={r.id} className="bg-card border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{r.reference}</p>
                    <p className="text-sm font-medium">{r.description}</p>
                    <p className="text-xs text-muted-foreground">{r.customer.fullName} · {r.type === 'buy_and_deliver' ? 'Buy & Deliver' : 'Errand Only'} · Drop-off: {r.dropoffLocation}</p>
                  </div>
                  <Badge variant="outline">₦{r.totalPaid.toLocaleString()}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Select value={chosenPartner[r.id] || ''} onValueChange={(v) => setChosenPartner((c) => ({ ...c, [r.id]: v }))}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder={eligiblePartners.length ? 'Choose a partner' : 'No eligible partners available'} /></SelectTrigger>
                    <SelectContent>
                      {eligiblePartners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.user.fullName} (trust: {p.trustScore})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => assign(r.id)} disabled={assigning === r.id || eligiblePartners.length === 0}>
                    {assigning === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Assign'}
                  </Button>
                </div>
                {r.type === 'buy_and_deliver' && eligiblePartners.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No partners are Type-A approved yet — grant eligibility in the Partners tab first.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2">In Progress ({data.activeRequests.length})</h3>
        <div className="space-y-2">
          {data.activeRequests.map((r) => (
            <div key={r.id} className="bg-card border rounded-lg p-3 text-sm">
              <p className="font-mono text-xs text-muted-foreground">{r.reference}</p>
              <p>{r.description}</p>
              <p className="text-xs text-muted-foreground">{r.customer.fullName} → {r.partner?.user.fullName} · {r.status.replace('_', ' ')}</p>
            </div>
          ))}
          {data.activeRequests.length === 0 && <p className="text-sm text-muted-foreground">Nothing in progress.</p>}
        </div>
      </div>
    </div>
  )
}

function PartnersTab() {
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending_review')

  const load = async () => {
    setLoading(true)
    const { data } = await api<{ partners: any[] }>(`/api/hr/partners?status=${statusFilter}`)
    setPartners(data?.partners || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [statusFilter])

  const act = async (id: string, action: string) => {
    const { error } = await api(`/api/hr/partners/${id}/approve`, { method: 'POST', body: { action } })
    if (error) { toast.error(error); return }
    toast.success(`Partner ${action}d`)
    load()
  }

  const toggleTypeA = async (id: string, grant: boolean) => {
    const { error } = await api(`/api/hr/partners/${id}/type-a-approve`, { method: 'POST', body: { grant } })
    if (error) { toast.error(error); return }
    toast.success(grant ? 'Type-A eligibility granted' : 'Type-A eligibility revoked')
    load()
  }

  return (
    <div className="space-y-3">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending_review">Pending Review</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : partners.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No partners in this status.</p>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <div key={p.id} className="bg-card border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium text-sm">{p.user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{p.user.matricNumber} · {p.user.department}, {p.user.level} Level</p>
                  {p.baseFeeNote && <p className="text-xs text-muted-foreground mt-0.5">{p.baseFeeNote}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">Trust score: {p.trustScore}</p>
                </div>
                <a href={p.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1"><Video className="w-3.5 h-3.5" /> View KYC video</Button>
                </a>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {statusFilter === 'pending_review' && (
                  <>
                    <Button size="sm" onClick={() => act(p.id, 'approve')}>Approve</Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(p.id, 'reject')}>Reject</Button>
                  </>
                )}
                {statusFilter === 'approved' && (
                  <>
                    {p.typeAEligible ? (
                      <Button size="sm" variant="outline" onClick={() => toggleTypeA(p.id, false)} className="gap-1"><ShieldOff className="w-3.5 h-3.5" /> Revoke Type-A</Button>
                    ) : (
                      <Button size="sm" onClick={() => toggleTypeA(p.id, true)} className="gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Grant Type-A (Buy & Deliver)</Button>
                    )}
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => act(p.id, 'suspend')}>Suspend</Button>
                  </>
                )}
                {statusFilter === 'suspended' && (
                  <Button size="sm" onClick={() => act(p.id, 'approve')}>Reinstate</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
