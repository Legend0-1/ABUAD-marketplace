'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LifeBuoy, ChevronRight, Loader2, ShieldCheck, Send, Inbox as InboxIcon } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = [
  'Payment or refund',
  'Order or delivery',
  'A seller or buyer',
  'My account or login',
  'Report a safety concern',
  'Suggestion or feedback',
  'Something else',
]

export function ContactAdminPage() {
  const { user, setView, setAuthModalOpen } = useStore()
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <LifeBuoy className="w-10 h-10 mx-auto text-primary mb-3" />
        <p className="text-muted-foreground mb-4">Sign in to contact the UNI MART team.</p>
        <Button onClick={() => setAuthModalOpen(true)}>Sign In</Button>
      </div>
    )
  }

  const submit = async () => {
    if (!body.trim()) { toast.error('Please describe your issue'); return }
    setSubmitting(true)
    const { data, error } = await api<{ conversationId: string }>('/api/support/contact', {
      method: 'POST',
      body: { category, subject, body },
    })
    setSubmitting(false)
    if (error) { toast.error(error); return }
    toast.success('Message sent to the UNI MART team')
    if (data?.conversationId) setView({ name: 'inboxThread', conversationId: data.conversationId })
    else setView({ name: 'inbox' })
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Contact Admin</span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <LifeBuoy className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Contact the UNI MART team</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Have a problem with an order, a payment, another user, or your account? Send us a message and
        the admin team will reply right here in your inbox.
      </p>

      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">What is this about?</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Choose a topic (optional)" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. My payment went through but the order is still pending" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Message</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Describe your issue in detail. Include order references or usernames where relevant so we can help faster."
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 rounded p-2 text-xs text-blue-700 dark:text-blue-400 flex gap-2">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Your message goes straight to the admin team. You'll get their reply in your inbox and by email if email is enabled on your account.</span>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={submit} disabled={submitting} className="gap-1">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Message
          </Button>
          <Button variant="ghost" onClick={() => setView({ name: 'inbox' })} className="gap-1">
            <InboxIcon className="w-4 h-4" /> View my inbox
          </Button>
        </div>
      </div>
    </div>
  )
}
