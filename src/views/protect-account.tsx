'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight, Lock, ShieldCheck, ShieldOff, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ProtectAccountPage() {
  const { setView, user, setUser, setAuthModalOpen } = useStore()

  // 2FA setup flow
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string } | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [settingUp, setSettingUp] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disabling, setDisabling] = useState(false)

  // Password change flow
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)

  const startTwoFactorSetup = async () => {
    setSettingUp(true)
    const { data, error } = await api<{ secret: string; qrDataUrl: string }>('/api/auth/2fa/setup', { method: 'POST' })
    setSettingUp(false)
    if (error) { toast.error(error); return }
    setSetupData(data || null)
  }

  const confirmTwoFactor = async () => {
    if (!setupData) return
    setSettingUp(true)
    const { error } = await api('/api/auth/2fa/enable', { method: 'POST', body: { secret: setupData.secret, code: setupCode } })
    setSettingUp(false)
    if (error) { toast.error(error); return }
    toast.success('Two-factor authentication enabled')
    setSetupData(null)
    setSetupCode('')
    if (user) setUser({ ...user, twoFactorEnabled: true } as any)
  }

  const disableTwoFactor = async () => {
    setDisabling(true)
    const { error } = await api('/api/auth/2fa/disable', { method: 'POST', body: { password: disablePassword } })
    setDisabling(false)
    if (error) { toast.error(error); return }
    toast.success('Two-factor authentication disabled')
    setDisablePassword('')
    if (user) setUser({ ...user, twoFactorEnabled: false } as any)
  }

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error('New passwords don\'t match'); return }
    setPwBusy(true)
    const { error } = await api('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword: pwForm.current, newPassword: pwForm.next },
    })
    setPwBusy(false)
    if (error) { toast.error(error); return }
    toast.success('Password updated')
    setPwForm({ current: '', next: '', confirm: '' })
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Protect Your Account</span>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden mb-5">
        <div className="amazon-accent-bar h-1.5" />
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-6 h-6 text-primary shrink-0" />
            <h1 className="text-xl font-bold">Protect Your Account</h1>
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-line text-sm leading-relaxed">
{`A few habits make your account meaningfully harder to compromise:

- Use a password you don't reuse anywhere else. If one site's database ever leaks, reused passwords are the first thing attackers try elsewhere.
- Turn on two-factor authentication below — even if someone learns your password, they can't get in without the 6-digit code from your phone.
- UNI MART admin will never ask for your password, 2FA code, or OTP over chat, email, or phone. Anyone asking for these is not really the admin — report it immediately.
- Don't share your account with anyone, including roommates or friends "just to check something."`}
          </div>
        </div>
      </div>

      {!user ? (
        <div className="bg-card border rounded-lg p-6 text-center text-sm text-muted-foreground">
          <button className="text-primary underline" onClick={() => setAuthModalOpen(true)}>Sign in</button> to manage your account's security.
        </div>
      ) : (
        <div className="space-y-5">
          {/* 2FA */}
          <div className="bg-card border rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-verified" />
              <h2 className="font-bold">Two-Factor Authentication (2FA)</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Status: {(user as any).twoFactorEnabled
                ? <span className="text-verified font-semibold">Enabled</span>
                : <span className="text-muted-foreground">Not enabled</span>}
            </p>

            {(user as any).twoFactorEnabled ? (
              <div className="space-y-2 max-w-sm">
                <Label className="text-xs">Enter your password to disable 2FA</Label>
                <Input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
                <Button variant="outline" className="text-destructive" onClick={disableTwoFactor} disabled={disabling || !disablePassword}>
                  {disabling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldOff className="w-4 h-4 mr-1" />}
                  Disable 2FA
                </Button>
              </div>
            ) : setupData ? (
              <div className="space-y-3 max-w-sm">
                <p className="text-xs">Scan this with Google Authenticator, Authy, or any TOTP app:</p>
                <img src={setupData.qrDataUrl} alt="2FA QR code" className="border rounded-lg w-48 h-48" />
                <p className="text-[11px] text-muted-foreground">
                  Can't scan? Enter this code manually: <code className="bg-muted px-1 rounded">{setupData.secret}</code>
                </p>
                <Label className="text-xs">Enter the 6-digit code to confirm</Label>
                <Input
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center tracking-[0.4em] font-mono"
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <Button onClick={confirmTwoFactor} disabled={settingUp || setupCode.length !== 6}>
                    {settingUp ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Confirm & Enable
                  </Button>
                  <Button variant="ghost" onClick={() => { setSetupData(null); setSetupCode('') }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button onClick={startTwoFactorSetup} disabled={settingUp}>
                {settingUp ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                Set Up 2FA
              </Button>
            )}
          </div>

          {/* Change password */}
          <div className="bg-card border rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-primary" />
              <h2 className="font-bold">Change Password</h2>
            </div>
            <div className="space-y-3 max-w-sm">
              <div className="space-y-1">
                <Label className="text-xs">Current password</Label>
                <Input type="password" value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New password</Label>
                <Input type="password" value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Confirm new password</Label>
                <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} />
              </div>
              <Button onClick={changePassword} disabled={pwBusy || !pwForm.current || !pwForm.next}>
                {pwBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Update Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
