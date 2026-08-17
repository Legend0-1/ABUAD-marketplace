'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ChevronRight, Flag } from 'lucide-react'
import { toast } from 'sonner'

const REASONS = [
  'Item never arrived',
  'Item significantly not as described',
  'Seller unresponsive after payment',
  'Harassment or abusive messages',
  'Suspected scam or fake listing',
  'Unsafe or inappropriate meetup behavior',
  'Other',
]

export function ReportUserPage() {
  const { setView, user, setAuthModalOpen } = useStore()
  const [partners, setPartners] = useState<{ id: string; fullName: string }[]>([])
  const [reportedUserId, setReportedUserId] = useState('')
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    (async () => {
      const { data } = await api<{ orders: { asBuyer: any[]; asSeller: any[] } }>('/api/orders/list')
      const seen = new Map<string, string>()
      data?.orders?.asBuyer?.forEach((o) => o.seller && seen.set(o.seller.id, o.seller.fullName))
      data?.orders?.asSeller?.forEach((o) => o.buyer && seen.set(o.buyer.id, o.buyer.fullName))
      setPartners(Array.from(seen, ([id, fullName]) => ({ id, fullName })))
    })()
  }, [user])

  const submit = async () => {
    if (!user) { setAuthModalOpen(true); return }
    if (!reportedUserId) { toast.error('Select who you\'re reporting'); return }
    if (!reason) { toast.error('Pick a reason'); return }
    setSubmitting(true)
    const { error } = await api('/api/reports/create', {
      method: 'POST',
      body: { reportedUserId, reason, details },
    })
    setSubmitting(false)
    if (error) { toast.error(error); return }
    toast.success('Report submitted', { description: 'The admin has been notified and will review your case.' })
    setReportedUserId('')
    setReason('')
    setDetails('')
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Report a User</span>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden mb-5">
        <div className="amazon-accent-bar h-1.5" />
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flag className="w-6 h-6 text-primary shrink-0" />
            <h1 className="text-xl font-bold">Report a User</h1>
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-line text-sm leading-relaxed">
{`Reports help us keep UNI MART safe and accountable. Use this for a failed transaction, poor service, harassment, or any behavior that broke the trust the platform depends on.

WHAT TO REPORT
- A seller who took payment but never delivered, or delivered something very different from the listing.
- A buyer or seller who was abusive, threatening, or inappropriate in messages or in person.
- Suspected fake listings, scams, or attempts to move a transaction off-platform to avoid escrow protection.

WHAT HAPPENS AFTER YOU REPORT
Your report goes directly to the admin team and is kept confidential — the person you report won't see who filed it. We review the transaction history and messages related to the case and follow up with either party if we need more information. Repeated or serious violations can lead to suspension.

A NOTE ON FALSE REPORTS
Reports are taken seriously on both sides — filing a knowingly false report is itself a violation of the Seller Agreement and can result in account action.

If an order is involved, you can also report directly from that seller's product page using the Report Seller button — it's the fastest way to attach the right context automatically.`}
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 sm:p-6 space-y-3">
        <h2 className="font-bold">File a report</h2>
        {!user ? (
          <p className="text-sm text-muted-foreground">
            <button className="text-primary underline" onClick={() => setAuthModalOpen(true)}>Sign in</button> to file a report.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Who are you reporting?</label>
              <Select value={reportedUserId} onValueChange={setReportedUserId}>
                <SelectTrigger><SelectValue placeholder="Select from someone you've transacted with" /></SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                  ))}
                  {partners.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No transaction history yet — report directly from a product page instead.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Details</label>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="What happened? Include as much detail as you can." />
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full">Submit Report</Button>
          </>
        )}
      </div>
    </div>
  )
}
