'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ID_TYPE_LABELS, type IdType } from '@/lib/verification'
import {
  ShieldCheck, Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Eye, ChevronDown, ChevronUp, IdCard,
} from 'lucide-react'
import { toast } from 'sonner'

type VerifUser = {
  id: string
  fullName: string
  email: string
  matricNumber?: string | null
  institution?: string | null
  country?: string | null
  profilePicture?: string | null
  idVerified?: boolean
}

type VerifListItem = {
  id: string
  idType: string
  status: string
  rejectionReason?: string | null
  reviewedAt?: string | null
  createdAt: string
  updatedAt: string
  user: VerifUser
}

// Image payloads live on a separate detail endpoint so the list stays light and
// sensitive ID photos are only pulled when an admin actually opens a record.
type VerifDetail = {
  id: string
  idType: string
  status: string
  frontImageUrl: string
  backImageUrl?: string | null
  rejectionReason?: string | null
}

const idLabel = (t: string) => ID_TYPE_LABELS[t as IdType] || t

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') return <Badge className="bg-amber-500 text-white gap-1"><Clock className="w-3 h-3" /> Pending</Badge>
  if (status === 'approved') return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>
  return <Badge className="bg-red-600 text-white gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>
}

export function AdminVerificationsManager() {
  const [pending, setPending] = useState<VerifListItem[]>([])
  const [reviewed, setReviewed] = useState<VerifListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await api<{ pending: VerifListItem[]; reviewed: VerifListItem[] }>('/api/admin/verifications')
    setPending(data?.pending || [])
    setReviewed(data?.reviewed || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const decide = async (verificationId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    setBusyId(verificationId)
    const { error } = await api('/api/admin/verifications', {
      method: 'POST',
      body: { verificationId, action, rejectionReason },
    })
    setBusyId(null)
    if (error) { toast.error(error); return }
    toast.success(action === 'approve' ? 'Identity approved — user can now sell' : 'Submission rejected')
    load()
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Identity Verifications</h3>
        <span className="text-xs text-muted-foreground">— review government IDs before a student can sell</span>
        <Button size="sm" variant="ghost" className="ml-auto gap-1" onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400 flex gap-2">
        <IdCard className="w-4 h-4 shrink-0 mt-0.5" />
        <span>These photos are sensitive personal data. Open a submission only to review it, and approve only when the photo is clear and the details match the account holder. Reject with a short reason so the student knows what to fix.</span>
      </div>

      {/* Pending queue */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          Awaiting review
          {pending.length > 0 && <Badge className="bg-amber-500 text-white">{pending.length}</Badge>}
        </h4>
        {pending.length === 0 ? (
          <div className="text-center py-10 bg-card border rounded-lg">
            <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-green-600" />
            <p className="font-bold text-sm">No submissions waiting</p>
            <p className="text-xs text-muted-foreground">New ID submissions will appear here.</p>
          </div>
        ) : (
          pending.map((v) => (
            <VerificationCard key={v.id} item={v} busy={busyId === v.id} onDecide={decide} />
          ))
        )}
      </div>

      {/* Recently reviewed */}
      {reviewed.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground">Recently reviewed</h4>
          {reviewed.map((v) => (
            <div key={v.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={v.user.profilePicture || undefined} />
                <AvatarFallback className="text-xs">{v.user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{v.user.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {idLabel(v.idType)} · {v.user.matricNumber || v.user.email}
                  {v.reviewedAt && <> · reviewed {new Date(v.reviewedAt).toLocaleDateString()}</>}
                </p>
                {v.status === 'rejected' && v.rejectionReason && (
                  <p className="text-[11px] text-muted-foreground truncate">Reason: {v.rejectionReason}</p>
                )}
              </div>
              <StatusBadge status={v.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VerificationCard({
  item, busy, onDecide,
}: {
  item: VerifListItem
  busy: boolean
  onDecide: (id: string, action: 'approve' | 'reject', reason?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<VerifDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  const loadDetail = async () => {
    if (detail) return
    setDetailLoading(true)
    const { data, error } = await api<{ verification: VerifDetail }>(`/api/admin/verifications/${item.id}`)
    setDetailLoading(false)
    if (error) { toast.error(error); return }
    setDetail(data?.verification || null)
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) loadDetail()
  }

  const confirmReject = () => {
    const r = reason.trim()
    if (!r) { toast.error('Give a short reason for the rejection'); return }
    onDecide(item.id, 'reject', r)
  }

  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={item.user.profilePicture || undefined} />
          <AvatarFallback className="text-sm">{item.user.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.user.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{item.user.email}</p>
          <p className="text-xs text-muted-foreground truncate">
            {item.user.matricNumber || '—'}{item.user.institution ? ` · ${item.user.institution}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{idLabel(item.idType)}</Badge>
            <span className="text-[11px] text-muted-foreground">submitted {new Date(item.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={toggle} className="gap-1 shrink-0">
          {open ? <><ChevronUp className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> View ID</>}
        </Button>
      </div>

      {open && (
        <div className="mt-3">
          {detailLoading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <Skeleton className="aspect-[16/10] w-full" />
              <Skeleton className="aspect-[16/10] w-full" />
            </div>
          ) : detail ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <figure>
                <figcaption className="text-[11px] text-muted-foreground mb-1">Front</figcaption>
                <img src={detail.frontImageUrl} alt="ID front" className="w-full rounded border bg-muted object-contain max-h-64" />
              </figure>
              {detail.backImageUrl && (
                <figure>
                  <figcaption className="text-[11px] text-muted-foreground mb-1">Back</figcaption>
                  <img src={detail.backImageUrl} alt="ID back" className="w-full rounded border bg-muted object-contain max-h-64" />
                </figure>
              )}
            </div>
          ) : (
            <p className="text-xs text-destructive">Could not load the images.</p>
          )}
        </div>
      )}

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Why is this being rejected? e.g. Photo too blurry to read the ID number."
            className="w-full text-sm rounded-md border px-2.5 py-1.5 bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={confirmReject} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />} Confirm rejection
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason('') }} disabled={busy}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" disabled={busy} onClick={() => onDecide(item.id, 'approve')}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-destructive" disabled={busy} onClick={() => setRejecting(true)}>
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
        </div>
      )}
    </div>
  )
}
