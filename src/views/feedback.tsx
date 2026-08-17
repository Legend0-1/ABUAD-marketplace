'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronRight, MessageCircleHeart } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = [
  { value: 'suggestion', label: 'Suggestion / idea' },
  { value: 'bug', label: 'Something\'s broken' },
  { value: 'compliment', label: 'Compliment' },
  { value: 'other', label: 'Other' },
]

export function FeedbackPage() {
  const { setView, user, setAuthModalOpen } = useStore()
  const [category, setCategory] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    if (!user) { setAuthModalOpen(true); return }
    if (!message.trim()) { toast.error('Write something first'); return }
    setSubmitting(true)
    const { error } = await api('/api/feedback', { method: 'POST', body: { category, message } })
    setSubmitting(false)
    if (error) { toast.error(error); return }
    setSubmitted(true)
    setMessage('')
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Feedback</span>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="amazon-accent-bar h-1.5" />
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircleHeart className="w-6 h-6 text-primary shrink-0" />
            <h1 className="text-xl font-bold">Help us improve UNI MART</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Tell us what's working, what isn't, or what you wish existed. Every submission is read by the team building this platform.
          </p>

          {submitted ? (
            <div className="text-center py-10">
              <MessageCircleHeart className="w-10 h-10 mx-auto text-verified mb-2" />
              <p className="font-semibold">Thanks — that's been sent through.</p>
              <Button variant="outline" className="mt-4" onClick={() => setSubmitted(false)}>Send another</Button>
            </div>
          ) : !user ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <button className="text-primary underline" onClick={() => setAuthModalOpen(true)}>Sign in</button> to send feedback.
            </div>
          ) : (
            <div className="space-y-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="What's on your mind?"
              />
              <Button onClick={submit} disabled={submitting} className="w-full">Send Feedback</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
