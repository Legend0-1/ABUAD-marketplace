'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { MailWarning, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function EmailVerificationBanner() {
  const { user } = useStore()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!user || (user as any).emailVerified) return null

  const resend = async () => {
    setSending(true)
    const { error } = await api('/api/auth/resend-verification', { method: 'POST' })
    setSending(false)
    if (error) { toast.error(error); return }
    setSent(true)
    toast.success('Verification email sent')
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
      <MailWarning className="w-5 h-5 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Verify your email</p>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
          Confirm {user.email} so you never miss an order alert or password reset link.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={resend} disabled={sending || sent}>
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
        {sent ? 'Sent!' : 'Resend Email'}
      </Button>
    </div>
  )
}
