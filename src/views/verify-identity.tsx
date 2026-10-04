'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronRight, ShieldCheck, Loader2, CheckCircle2, Clock, XCircle, Upload, X, Lock, IdCard,
} from 'lucide-react'
import { toast } from 'sonner'
import { ID_TYPES, ID_TYPE_LABELS, requiresBackImage, type IdType } from '@/lib/verification'

type MyVerification = {
  idType: string
  status: string
  rejectionReason?: string | null
  reviewedAt?: string | null
  createdAt?: string
  updatedAt?: string
} | null

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function VerifyIdentityPage() {
  const { user, setView, setAuthModalOpen, setUser } = useStore()
  const [loading, setLoading] = useState(true)
  const [idVerified, setIdVerified] = useState(false)
  const [record, setRecord] = useState<MyVerification>(null)

  const [idType, setIdType] = useState<IdType>('national_id')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); setLoading(false); return }
    (async () => {
      const { data } = await api<{ idVerified: boolean; verification: MyVerification }>('/api/verification/me')
      setIdVerified(!!data?.idVerified)
      setRecord(data?.verification || null)
      if (data?.verification?.idType && (ID_TYPES as readonly string[]).includes(data.verification.idType)) {
        setIdType(data.verification.idType as IdType)
      }
      // If the fresh check says we're verified but the store still has the old
      // flag (an admin approved us since this session loaded), refresh the store
      // so the selling gates stop blocking. /api/auth/me returns the canonical
      // shape the rest of the app expects.
      if (data?.idVerified && !user.idVerified) {
        api<{ user: any }>('/api/auth/me').then(({ data: me }) => { if (me?.user) setUser(me.user) })
      }
      setLoading(false)
    })()
  }, [user, setAuthModalOpen, setUser])

  const onPick = (which: 'front' | 'back', file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image too large', { description: 'Maximum 5MB. Try a smaller or more compressed photo.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      if (which === 'front') setFront(dataUrl)
      else setBack(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!front) { toast.error('Upload a photo of the front of your ID'); return }
    if (requiresBackImage(idType) && !back) { toast.error('Upload a photo of the back of your ID too'); return }
    setBusy(true)
    const { data, error } = await api<{ message?: string }>('/api/verification/submit', {
      method: 'POST',
      body: { idType, frontImageUrl: front, backImageUrl: back || undefined },
    })
    setBusy(false)
    if (error) { toast.error('Could not submit', { description: error }); return }
    toast.success('Submitted for review', { description: data?.message })
    setRecord({ idType, status: 'pending' })
    setFront(''); setBack('')
    // Keep the store's user flag in sync (still unverified until an admin approves,
    // but this refreshes any other derived state cleanly).
    api<{ user: any }>('/api/auth/me').then(({ data }) => { if (data?.user) setUser(data.user) })
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="w-10 h-10 mx-auto text-primary mb-3" />
        <p className="text-muted-foreground mb-4">Sign in to verify your identity.</p>
        <Button onClick={() => setAuthModalOpen(true)}>Sign In</Button>
      </div>
    )
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin" /></div>

  const status = idVerified ? 'approved' : (record?.status || 'none')
  const showForm = status === 'none' || status === 'rejected'

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Verify your identity</span>
      </div>

      <div className="bg-primary text-primary-foreground rounded-lg p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Identity Verification</h1>
            <p className="text-sm text-white/80">Confirm who you are to start selling on UNI MART.</p>
          </div>
        </div>
      </div>

      {/* Status cards */}
      {status === 'approved' && (
        <div className="bg-card border rounded-lg p-6 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-2" />
          <h2 className="font-bold text-lg">You're verified</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Your identity has been confirmed. You can set up a storefront and start listing.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setView({ name: 'setup-storefront' })}>Set up Storefront</Button>
            <Button variant="outline" onClick={() => setView({ name: 'home' })}>Browse</Button>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="bg-card border rounded-lg p-6 text-center">
          <Clock className="w-12 h-12 mx-auto text-amber-500 mb-2" />
          <h2 className="font-bold text-lg">Under review</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We've received your {ID_TYPE_LABELS[(record?.idType as IdType)] || 'ID'} and it's being reviewed. This is usually quick —
            you'll be able to sell as soon as it's approved.
          </p>
        </div>
      )}

      {status === 'rejected' && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-500/30 rounded-lg p-4 mb-4 flex gap-2">
          <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-red-700 dark:text-red-400">Your previous submission was rejected</p>
            {record?.rejectionReason && <p className="text-red-700/90 dark:text-red-400/90 mt-0.5">Reason: {record.rejectionReason}</p>}
            <p className="text-muted-foreground mt-1">Please re-check the guidance below and submit again.</p>
          </div>
        </div>
      )}

      {/* Submission form (new or re-submit after rejection) */}
      {showForm && (
        <div className="bg-card border rounded-lg p-4 sm:p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400 flex gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your ID is used only to confirm your identity and is visible only to UNI MART admins. Make sure the photo is clear, in focus, and shows all four corners of the document.</span>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-1"><IdCard className="w-4 h-4 text-primary" /> Which ID are you using? <span className="text-destructive">*</span></Label>
            <Select value={idType} onValueChange={(v) => { setIdType(v as IdType); setBack('') }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ID_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{ID_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <ImageDropzone
              label={requiresBackImage(idType) ? 'Front of ID' : 'Photo page'}
              required
              value={front}
              onPick={(f) => onPick('front', f)}
              onClear={() => setFront('')}
            />
            {requiresBackImage(idType) && (
              <ImageDropzone
                label="Back of ID"
                required
                value={back}
                onPick={(f) => onPick('back', f)}
                onClear={() => setBack('')}
              />
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setView({ name: 'home' })}>Cancel</Button>
            <Button onClick={submit} disabled={busy} size="lg">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : <><Upload className="w-4 h-4 mr-2" /> Submit for review</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageDropzone({
  label, required, value, onPick, onClear,
}: {
  label: string; required?: boolean; value: string; onPick: (f: File | undefined) => void; onClear: () => void
}) {
  return (
    <div>
      <Label className="text-xs">{label} {required && <span className="text-destructive">*</span>}</Label>
      {value ? (
        <div className="relative mt-1 aspect-[16/10] bg-muted rounded-lg overflow-hidden border">
          <img src={value} alt={label} className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
            aria-label={`Remove ${label}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg aspect-[16/10] cursor-pointer hover:bg-accent/30">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Tap to upload or take a photo</span>
        </label>
      )}
    </div>
  )
}
