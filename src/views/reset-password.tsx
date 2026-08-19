'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function ResetPasswordPage({ token }: { token: string }) {
  const { setView } = useStore()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (newPassword !== confirm) { toast.error('Passwords don\'t match'); return }
    setBusy(true)
    const { error } = await api('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } })
    setBusy(false)
    if (error) { toast.error(error); return }
    setDone(true)
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <div className="bg-card border rounded-lg p-6 text-center">
        {done ? (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-verified mb-2" />
            <h1 className="font-bold text-lg mb-1">Password updated</h1>
            <p className="text-sm text-muted-foreground mb-4">You can now sign in with your new password.</p>
            <Button className="w-full" onClick={() => setView({ name: 'home' })}>Go to Sign In</Button>
          </>
        ) : (
          <>
            <KeyRound className="w-8 h-8 mx-auto text-primary mb-2" />
            <h1 className="font-bold text-lg mb-4">Set a new password</h1>
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <Label className="text-xs">New password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Confirm new password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button className="w-full" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Update Password
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
