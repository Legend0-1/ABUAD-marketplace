'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserCheck, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

export function AdminApprovalsManager() {
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const toggleSelected = (id: string) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected((s) => (s.size === pending.length ? new Set() : new Set(pending.map((u) => u.id))))
  }

  const bulkApprove = async () => {
    if (selected.size === 0) return
    if (!confirm(`Approve ${selected.size} account${selected.size === 1 ? '' : 's'}? Each will get an email right away.`)) return
    setBulkBusy(true)
    const { data, error } = await api<{ count: number }>('/api/admin/pending-users', {
      method: 'POST',
      body: { userIds: Array.from(selected), action: 'approve' },
    })
    setBulkBusy(false)
    if (error) { toast.error(error); return }
    toast.success(`${data?.count || 0} accounts approved`)
    setSelected(new Set())
    load()
  }

  const load = async () => {
    setLoading(true)
    const { data } = await api<{ pending: any[] }>('/api/admin/pending-users')
    setPending(data?.pending || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const approve = async (userId: string) => {
    setBusyId(userId)
    const { error } = await api('/api/admin/pending-users', { method: 'POST', body: { userId, action: 'approve' } })
    setBusyId(null)
    if (error) { toast.error(error); return }
    toast.success('Account approved — they\'ve been emailed')
    load()
  }

  const reject = async (userId: string) => {
    setBusyId(userId)
    const { error } = await api('/api/admin/pending-users', { method: 'POST', body: { userId, action: 'reject', reason: rejectReason.trim() || undefined } })
    setBusyId(null)
    setRejectingId(null)
    setRejectReason('')
    if (error) { toast.error(error); return }
    toast.success('Registration rejected')
    load()
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Pending Registrations</h3>
        <span className="text-xs text-muted-foreground">— new accounts can't log in until approved here</span>
      </div>

      {pending.length > 0 && (
        <div className="flex items-center justify-between bg-muted/40 border rounded-lg px-3 py-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={selected.size === pending.length} onChange={toggleSelectAll} />
            {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
          </label>
          {selected.size > 0 && (
            <Button size="sm" onClick={bulkApprove} disabled={bulkBusy} className="gap-1">
              {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve {selected.size} Selected
            </Button>
          )}
        </div>
      )}

      {pending.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-16">Nothing waiting on approval right now.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((u) => (
            <div key={u.id} className="bg-card border rounded-lg p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggleSelected(u.id)}
                  className="mt-1.5 shrink-0"
                />
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={u.profilePicture || undefined} />
                  <AvatarFallback>{u.fullName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · {u.phone}</p>
                  <p className="text-xs text-muted-foreground">{u.matricNumber} · {u.department}, {u.level} Level</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> Registered {new Date(u.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {rejectingId === u.id ? (
                <div className="mt-2 space-y-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason (optional, included in the email they receive)"
                    className="w-full text-xs border rounded px-2 py-1.5 bg-background"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => reject(u.id)} disabled={busyId === u.id}>
                      {busyId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Reject'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason('') }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => approve(u.id)} disabled={busyId === u.id} className="gap-1">
                    {busyId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => setRejectingId(u.id)}>
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
