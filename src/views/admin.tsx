'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Users, Store, Package, MessageSquare, AlertTriangle, Banknote, TrendingUp,
  CheckCircle2, XCircle, Eye, ShieldCheck, Send, Mail, ChevronRight, Loader2, Star, Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminAgreementManager } from '@/components/admin-agreement-manager'
import { AdminFeedbackManager } from '@/components/admin-feedback-manager'
import { AdminAuditLog } from '@/components/admin-audit-log'
import { AdminRevenueReport } from '@/components/admin-revenue-report'
import { AdminReferralManager } from '@/components/admin-referral-manager'

export function AdminPage() {
  const { user, setView, setAuthModalOpen } = useStore()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState<any>(null)
  const [storefronts, setStorefronts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    const [dash, sf, us, rep, convs, ords] = await Promise.all([
      api('/api/admin/dashboard'),
      api('/api/admin/storefronts'),
      api('/api/admin/users'),
      api('/api/admin/reports'),
      api('/api/admin/messages'),
      api('/api/admin/orders'),
    ])
    if (dash.data) setStats(dash.data)
    if (sf.data?.storefronts) setStorefronts(sf.data.storefronts)
    if (us.data?.users) setUsers(us.data.users)
    if (rep.data?.reports) setReports(rep.data.reports)
    if (convs.data?.conversations) setConversations(convs.data.conversations)
    if (ords.data?.orders) setOrders(ords.data.orders)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); return }
    if (!user.isAdmin) { setView({ name: 'home' }); return }
    reload()
  }, [user, setAuthModalOpen, setView])

  if (!user || !user.isAdmin) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Admin access required.</div>
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Admin Dashboard</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Badge variant="secondary">Admin: {user.fullName}</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="storefronts">
            Storefronts {stats?.pendingStorefronts > 0 && <Badge className="ml-1 bg-amber-500 text-white">{stats.pendingStorefronts}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="messages">Messages {conversations.length > 0 && <Badge className="ml-1" variant="secondary">{conversations.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="reports">Reports {stats?.openReports > 0 && <Badge className="ml-1 bg-red-500 text-white">{stats.openReports}</Badge>}</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          <TabsTrigger value="agreement">Agreement</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} />
            <StatCard icon={Store} label="Storefronts" value={stats?.totalStorefronts || 0} sub={`${stats?.pendingStorefronts || 0} pending`} />
            <StatCard icon={Package} label="Listings" value={stats?.totalProducts || 0} />
            <StatCard icon={MessageSquare} label="Messages" value={stats?.totalMessages || 0} sub="monitored" />
            <StatCard icon={Banknote} label="Platform Revenue" value={`₦${(stats?.platformRevenue || 0).toLocaleString()}`} sub="20% charges" />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-bold mb-2">Recent Orders</h3>
              <div className="space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin">
                {stats?.recentOrders?.map((o: any) => (
                  <div key={o.id} className="text-xs p-2 border rounded flex items-center gap-2">
                    <Package className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{o.product?.title}</p>
                      <p className="text-muted-foreground">{o.buyer?.fullName} → {o.seller?.fullName}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{o.status.replace('_', ' ')}</Badge>
                    <span className="font-bold text-primary">₦{o.totalAmount.toLocaleString()}</span>
                  </div>
                ))}
                {(!stats?.recentOrders || stats.recentOrders.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">No orders yet.</p>}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-bold mb-2">Category Breakdown</h3>
              <div className="space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin">
                {stats?.categories?.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.name}</span>
                    <Badge variant="secondary">{c._count?.products || 0} listings</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Storefronts */}
        <TabsContent value="storefronts" className="mt-4 space-y-3">
          <h2 className="font-bold">All Storefronts ({storefronts.length})</h2>
          {storefronts.map((s) => (
            <div key={s.id} className="bg-card border rounded-lg p-3 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-bold">{s.name}</p>
                  <Badge className={`capitalize ${
                    s.status === 'active' ? 'bg-green-600 text-white' :
                    s.status === 'pending_approval' ? 'bg-amber-500 text-white' :
                    s.status === 'suspended' ? 'bg-red-600 text-white' :
                    'bg-gray-500 text-white'
                  }`}>{s.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>Owner: {s.owner?.fullName} ({s.owner?.matricNumber}) — {s.owner?.department} · {s.owner?.level} Level</p>
                  <p className="flex items-center gap-1 flex-wrap">Bank: {s.bankName} · {s.accountNumber} ({s.accountName}) · <Phone className="w-3 h-3 inline" /> {s.phoneNumber}</p>
                  <p>{s._count?.products || 0} listings · {s._count?.orders || 0} orders · ⭐ {s.rating?.toFixed?.(1) || 'New'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col">
                {s.status === 'pending_approval' && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                    const { error } = await api('/api/admin/storefronts', { method: 'POST', body: { storefrontId: s.id, action: 'approve' } })
                    if (error) { toast.error(error); return }
                    toast.success('Storefront approved')
                    reload()
                  }}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                )}
                {s.status === 'active' && (
                  <Button size="sm" variant="destructive" onClick={async () => {
                    const { error } = await api('/api/admin/storefronts', { method: 'POST', body: { storefrontId: s.id, action: 'suspend' } })
                    if (error) { toast.error(error); return }
                    toast.success('Storefront suspended')
                    reload()
                  }}><XCircle className="w-3.5 h-3.5 mr-1" /> Suspend</Button>
                )}
                {s.status === 'suspended' && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                    const { error } = await api('/api/admin/storefronts', { method: 'POST', body: { storefrontId: s.id, action: 'reactivate' } })
                    if (error) { toast.error(error); return }
                    toast.success('Storefront reactivated')
                    reload()
                  }}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reactivate</Button>
                )}
                {s.status === 'rejected' && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    const { error } = await api('/api/admin/storefronts', { method: 'POST', body: { storefrontId: s.id, action: 'approve' } })
                    if (error) { toast.error(error); return }
                    toast.success('Storefront approved')
                    reload()
                  }}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                )}
              </div>
            </div>
          ))}
          {storefronts.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No storefronts.</p>}
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="mt-4">
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Matric</th>
                    <th className="text-left p-3">Dept / Level</th>
                    <th className="text-left p-3">Listings</th>
                    <th className="text-left p-3">Orders</th>
                    <th className="text-left p-3">Reports</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={u.profilePicture || undefined} />
                            <AvatarFallback className="text-xs">{u.fullName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.fullName} {u.isAdmin && <ShieldCheck className="w-3 h-3 inline text-primary" />} {u.isHR && <Badge variant="outline" className="text-[9px] ml-1">HR</Badge>}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs">{u.matricNumber}</td>
                      <td className="p-3 text-xs">{u.department}<br />{u.level} Lvl</td>
                      <td className="p-3 text-xs">{u._count?.products || 0}</td>
                      <td className="p-3 text-xs">{(u._count?.ordersAsBuyer || 0) + (u._count?.ordersAsSeller || 0)}</td>
                      <td className="p-3 text-xs">
                        {u._count?.reportsAgainst > 0 ? <Badge variant="destructive">{u._count.reportsAgainst}</Badge> : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {u.isBanned ? (
                            <Button size="sm" variant="outline" onClick={async () => {
                              const { error } = await api('/api/admin/users', { method: 'POST', body: { userId: u.id, action: 'unban' } })
                              if (error) { toast.error(error); return }
                              toast.success('User unbanned')
                              reload()
                            }}>Unban</Button>
                          ) : (
                            <Button size="sm" variant="destructive" onClick={async () => {
                              if (!confirm(`Ban ${u.fullName}? This will suspend their storefront too.`)) return
                              const { error } = await api('/api/admin/users', { method: 'POST', body: { userId: u.id, action: 'ban' } })
                              if (error) { toast.error(error); return }
                              toast.success('User banned')
                              reload()
                            }}>Ban</Button>
                          )}
                          {u.isAdmin ? (
                            <Button size="sm" variant="outline" onClick={async () => {
                              if (!confirm(`Remove admin access from ${u.fullName}?`)) return
                              const { error } = await api('/api/admin/users', { method: 'POST', body: { userId: u.id, action: 'remove_admin' } })
                              if (error) { toast.error(error); return }
                              toast.success('Admin access removed')
                              reload()
                            }}>Remove Admin</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={async () => {
                              if (!confirm(`Grant admin access to ${u.fullName}? This gives full platform control.`)) return
                              const { error } = await api('/api/admin/users', { method: 'POST', body: { userId: u.id, action: 'make_admin' } })
                              if (error) { toast.error(error); return }
                              toast.success('Admin access granted')
                              reload()
                            }}>Make Admin</Button>
                          )}
                          {u.isHR ? (
                            <Button size="sm" variant="outline" onClick={async () => {
                              const { error } = await api('/api/admin/users', { method: 'POST', body: { userId: u.id, action: 'remove_hr' } })
                              if (error) { toast.error(error); return }
                              toast.success('HR access removed')
                              reload()
                            }}>Remove HR</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={async () => {
                              const { error } = await api('/api/admin/users', { method: 'POST', body: { userId: u.id, action: 'make_hr' } })
                              if (error) { toast.error(error); return }
                              toast.success('HR access granted')
                              reload()
                            }}>Make HR</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages" className="mt-4 space-y-2">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2 mb-2">
            <Eye className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Message review is for safety/fraud investigations, as disclosed in the Seller Agreement. Use Broadcast to send official notices.</span>
          </div>
          <h2 className="font-bold">All Conversations ({conversations.length})</h2>
          {conversations.map((c) => (
            <div key={c.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
              <div className="flex -space-x-2">
                <Avatar className="w-8 h-8 border-2 border-card">
                  <AvatarImage src={c.participantA?.profilePicture || undefined} />
                  <AvatarFallback className="text-xs">{c.participantA?.fullName?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                {c.participantB && (
                  <Avatar className="w-8 h-8 border-2 border-card">
                    <AvatarImage src={c.participantB?.profilePicture || undefined} />
                    <AvatarFallback className="text-xs">{c.participantB?.fullName?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {c.participantA?.fullName} {c.participantB ? `↔ ${c.participantB.fullName}` : '(broadcast)'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.messages?.[0]?.body || c.subject || 'No messages'}
                </p>
              </div>
              <Badge variant="secondary">{c._count?.messages || 0} msgs</Badge>
              <Button size="sm" variant="outline" onClick={() => setView({ name: 'inboxThread', conversationId: c.id })}>
                <Eye className="w-3.5 h-3.5 mr-1" /> View
              </Button>
            </div>
          ))}
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="mt-4 space-y-2">
          <h2 className="font-bold">User Reports ({reports.length})</h2>
          {reports.map((r) => (
            <div key={r.id} className="bg-card border rounded-lg p-3">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge className={`capitalize ${
                  r.status === 'open' ? 'bg-red-500 text-white' :
                  r.status === 'resolved' ? 'bg-green-600 text-white' :
                  r.status === 'dismissed' ? 'bg-gray-500 text-white' :
                  'bg-amber-500 text-white'
                }`}>{r.status}</Badge>
                <Badge variant="outline" className="text-xs">{r.reason}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm">
                <strong>{r.reporter?.fullName}</strong> reported <strong>{r.reportedUser?.fullName}</strong>
                {r.productId && <span className="text-muted-foreground"> (on a product)</span>}
              </p>
              {r.details && <p className="text-sm text-muted-foreground mt-1">{r.details}</p>}
              {r.adminNote && <p className="text-xs italic mt-1">Admin note: {r.adminNote}</p>}
              <div className="flex gap-2 mt-2">
                {r.status === 'open' && (
                  <>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const { error } = await api('/api/admin/reports', { method: 'POST', body: { reportId: r.id, status: 'reviewing' } })
                      if (error) { toast.error(error); return }
                      reload()
                    }}>Mark Reviewing</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                      const { error } = await api('/api/admin/reports', { method: 'POST', body: { reportId: r.id, status: 'resolved', adminNote: 'Reviewed and actioned.' } })
                      if (error) { toast.error(error); return }
                      toast.success('Report resolved')
                      reload()
                    }}>Resolve</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const { error } = await api('/api/admin/reports', { method: 'POST', body: { reportId: r.id, status: 'dismissed', adminNote: 'No violation found.' } })
                      if (error) { toast.error(error); return }
                      reload()
                    }}>Dismiss</Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {reports.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No reports.</p>}
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders" className="mt-4 space-y-2">
          <h2 className="font-bold">All Orders ({orders.length})</h2>
          {orders.map((o) => (
            <div key={o.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{o.product?.title}</p>
                <p className="text-xs text-muted-foreground">
                  {o.reference} · {o.buyer?.fullName} → {o.seller?.fullName} · {o.storefront?.name}
                </p>
                <p className="text-xs">
                  <span className="font-bold text-primary">₦{o.totalAmount.toLocaleString()}</span>
                  <span className="text-muted-foreground"> · charge ₦{o.serviceCharge.toLocaleString()} · payout ₦{o.sellerPayout.toLocaleString()}</span>
                </p>
              </div>
              <Badge className={`capitalize ${
                o.status === 'completed' ? 'bg-green-600 text-white' :
                o.status === 'disputed' ? 'bg-red-600 text-white' :
                o.status === 'refunded' ? 'bg-slate-600 text-white' :
                'bg-amber-500 text-white'
              }`}>{o.status.replace('_', ' ')}</Badge>
              {o.status === 'disputed' && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="bg-slate-600 hover:bg-slate-700 text-white" onClick={async () => {
                    const note = prompt('Refund reason:')
                    if (!note) return
                    const { error } = await api('/api/admin/orders', { method: 'POST', body: { orderId: o.id, action: 'refund', note } })
                    if (error) { toast.error(error); return }
                    toast.success('Refund issued to buyer')
                    reload()
                  }}>Refund Buyer</Button>
                  <Button size="sm" variant="outline" className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                    const note = prompt('Release note:')
                    if (!note) return
                    const { error } = await api('/api/admin/orders', { method: 'POST', body: { orderId: o.id, action: 'release', note } })
                    if (error) { toast.error(error); return }
                    toast.success('Payout released to seller')
                    reload()
                  }}>Release to Seller</Button>
                </div>
              )}
            </div>
          ))}
          {orders.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No orders.</p>}
        </TabsContent>

        {/* Broadcast */}
        <TabsContent value="broadcast" className="mt-4 space-y-3">
          <BroadcastPanel onSent={reload} />
        </TabsContent>

        <TabsContent value="agreement" className="mt-4">
          <AdminAgreementManager />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <AdminFeedbackManager />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AdminAuditLog />
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <AdminRevenueReport />
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <AdminReferralManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: any; sub?: string }) {
  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function BroadcastPanel({ onSent }: { onSent: () => void }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [userIds, setUserIds] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!body) { toast.error('Message body required'); return }
    setBusy(true)
    const ids = userIds.split(',').map((s) => s.trim()).filter(Boolean)
    const { data, error } = await api('/api/messages/broadcast', {
      method: 'POST',
      body: { subject: subject || 'Message from UNI MART Admin', body, userIds: ids },
    })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.success(`Broadcast sent to ${data.count} user${data.count !== 1 ? 's' : ''}`)
    setSubject('')
    setBody('')
    setUserIds('')
    onSent()
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-5 h-5 text-primary" />
        <h2 className="font-bold">Send Broadcast Message</h2>
      </div>
      <p className="text-xs text-muted-foreground">This message will appear in every recipient's inbox as an admin conversation. Leave the user IDs blank to send to ALL users.</p>
      <div>
        <Label>Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Important update to seller agreement" />
      </div>
      <div>
        <Label>Message</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Type your message to all users…" />
      </div>
      <div>
        <Label>Specific User IDs (optional, comma-separated)</Label>
        <Input value={userIds} onChange={(e) => setUserIds(e.target.value)} placeholder="Leave blank to broadcast to everyone" />
      </div>
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 rounded p-2 text-xs text-blue-700 dark:text-blue-400 flex gap-2">
        <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Messages are also delivered as simulated emails to the users' registered emails.</span>
      </div>
      <Button onClick={send} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Send Broadcast
      </Button>
    </div>
  )
}
