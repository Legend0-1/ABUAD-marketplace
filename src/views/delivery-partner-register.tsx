'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { BankAccountFields } from '@/components/bank-account-fields'
import { ChevronRight, Truck, Video, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export function DeliveryPartnerRegisterPage() {
  const { setView, user, setAuthModalOpen } = useStore()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [videoDataUrl, setVideoDataUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ bankName: '', bankCode: '', accountName: '', accountNumber: '', baseFeeNote: '', deliveryFee: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    (async () => {
      const { data } = await api<{ profile: any }>('/api/delivery/partner/me')
      setProfile(data?.profile || null)
      setLoading(false)
    })()
  }, [user])

  const handleVideo = async (file: File) => {
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const { data, error } = await api<{ url: string }>('/api/upload', { method: 'POST', body: { type: 'video', dataUrl } })
      setUploading(false)
      if (error) { toast.error(error); return }
      if (data?.url) setVideoDataUrl(data.url)
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!videoDataUrl) { toast.error('Please record/upload your verification video first'); return }
    if (!form.bankName || !form.accountName || !form.accountNumber) { toast.error('Bank details are required for payouts'); return }
    const fee = Number(form.deliveryFee)
    if (!Number.isFinite(fee) || fee <= 0) { toast.error('Enter your delivery fee (per job)'); return }
    setSubmitting(true)
    const { data, error } = await api('/api/delivery/partner/register', {
      method: 'POST',
      body: { videoUrl: videoDataUrl, ...form, deliveryFee: fee },
    })
    setSubmitting(false)
    if (error) { toast.error(error); return }
    toast.success('Application submitted', { description: 'HR will review your video and details shortly.' })
    setProfile(data.profile)
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Truck className="w-10 h-10 mx-auto text-primary mb-3" />
        <p className="text-muted-foreground mb-4">Sign in to register as a delivery partner.</p>
        <Button onClick={() => setAuthModalOpen(true)}>Sign In</Button>
      </div>
    )
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Become a Delivery Partner</span>
      </div>

      {profile ? (
        <div className="bg-card border rounded-lg p-6 text-center">
          {profile.status === 'approved' && <CheckCircle2 className="w-10 h-10 mx-auto text-verified mb-2" />}
          {profile.status === 'pending_review' && <Clock className="w-10 h-10 mx-auto text-amber-500 mb-2" />}
          {(profile.status === 'rejected' || profile.status === 'suspended') && <XCircle className="w-10 h-10 mx-auto text-destructive mb-2" />}
          <h2 className="font-bold text-lg capitalize">{profile.status.replace('_', ' ')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {profile.status === 'pending_review' && "Your application is with HR for review. You'll be notified once it's processed."}
            {profile.status === 'approved' && (profile.typeAEligible
              ? "You're approved for both errand and buy-and-deliver jobs."
              : "You're approved for errand-only jobs. Buy-and-deliver eligibility requires a separate HR review.")}
            {profile.status === 'rejected' && 'Your application was not approved. Contact HR for details.'}
            {profile.status === 'suspended' && 'Your delivery partner account is currently suspended.'}
          </p>
          {profile.status === 'approved' && (
            <div className="mt-4 space-y-3">
              <PartnerFeeAvailability profile={profile} onUpdated={setProfile} />
              <Button onClick={() => setView({ name: 'deliveries' })}>View My Deliveries</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="amazon-accent-bar h-1.5" />
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">Become a Delivery Partner</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Deliver purchases or run errands for fellow students, and get paid per job. A short verification video is required —
              your name and matric number are already on file from your account, so HR can verify your identity before approving you.
            </p>

            <div className="space-y-2">
              <Label className="text-xs">Verification video (introduce yourself, show your face clearly)</Label>
              {videoDataUrl ? (
                <video src={videoDataUrl} controls className="w-full rounded-lg border max-h-64" />
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-accent/30">
                  <input type="file" accept="video/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideo(f) }} />
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : <Video className="w-6 h-6 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{uploading ? 'Uploading…' : 'Tap to record or upload a video'}</span>
                </label>
              )}
            </div>

            <div className="space-y-3">
              <BankAccountFields
                value={{ bankName: form.bankName, bankCode: form.bankCode, accountNumber: form.accountNumber, accountName: form.accountName }}
                onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Your delivery fee (₦ per job) <span className="text-destructive">*</span></Label>
                  <Input
                    inputMode="numeric"
                    value={form.deliveryFee}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="e.g. 500"
                  />
                  <p className="text-[11px] text-muted-foreground">Customers see this price and pick a partner. A ₦1,000 platform fee is added on top at checkout.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Availability / notes (optional)</Label>
                  <Textarea value={form.baseFeeNote} onChange={(e) => setForm((f) => ({ ...f, baseFeeNote: e.target.value }))} rows={2} placeholder="e.g. Available evenings, fast within campus" />
                </div>
              </div>
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Submit Application
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Lets an approved partner adjust their per-job delivery fee and toggle whether
 * they're currently available to receive new requests / appear in the customer's
 * pick-a-partner list. Saves via PATCH /api/delivery/partner/settings.
 */
function PartnerFeeAvailability({ profile, onUpdated }: { profile: any; onUpdated: (p: any) => void }) {
  const [fee, setFee] = useState(String(profile.deliveryFee ?? ''))
  const [available, setAvailable] = useState<boolean>(profile.isAvailable ?? true)
  const [savingFee, setSavingFee] = useState(false)
  const [savingAvail, setSavingAvail] = useState(false)

  const saveFee = async () => {
    const n = Number(fee)
    if (!Number.isFinite(n) || n <= 0) { toast.error('Enter a valid delivery fee'); return }
    setSavingFee(true)
    const { data, error } = await api<{ profile: any }>('/api/delivery/partner/settings', { method: 'PATCH', body: { deliveryFee: n } })
    setSavingFee(false)
    if (error) { toast.error(error); return }
    if (data?.profile) onUpdated(data.profile)
    toast.success('Delivery fee updated')
  }

  const toggleAvailable = async (next: boolean) => {
    setAvailable(next)
    setSavingAvail(true)
    const { data, error } = await api<{ profile: any }>('/api/delivery/partner/settings', { method: 'PATCH', body: { isAvailable: next } })
    setSavingAvail(false)
    if (error) { setAvailable(!next); toast.error(error); return }
    if (data?.profile) onUpdated(data.profile)
    toast.success(next ? "You're now available for new deliveries" : "You're now hidden from new requests")
  }

  return (
    <div className="text-left bg-muted/40 border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Available for new deliveries</p>
          <p className="text-xs text-muted-foreground">Turn off to stop appearing in the customer pick-a-partner list.</p>
        </div>
        <Switch checked={available} disabled={savingAvail} onCheckedChange={toggleAvailable} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Your delivery fee (₦ per job)</Label>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            value={fee}
            onChange={(e) => setFee(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 500"
          />
          <Button variant="outline" onClick={saveFee} disabled={savingFee}>
            {savingFee ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">A ₦1,000 platform fee is added on top at customer checkout.</p>
      </div>
    </div>
  )
}
