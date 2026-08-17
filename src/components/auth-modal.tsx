'use client'

import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, ShieldCheck, Upload, X, GraduationCap, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const DEPARTMENTS = [
  'Medicine & Surgery',
  'Law',
  'Engineering',
  'Computer Science',
  'Sciences',
  'Social Sciences',
  'Arts & Humanities',
  'Business Administration',
  'Nursing Sciences',
  'Medical Laboratory Science',
  'Pharmacy',
  'Agricultural Science',
  'Education',
  'Architecture',
  'Estate Management',
  'Quantity Surveying',
]

const LEVELS = ['100', '200', '300', '400', '500', '600']

export function AuthModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { authMode, setAuthMode, setUser, setView, toast: storeToast } = useStore()
  const [mode, setMode] = useState<'register' | 'login'>(authMode)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', matricNumber: '', level: '', department: '', profilePicture: '' as string, referralCode: '',
  })
  const fileRef = useRef<HTMLInputElement>(null)

  // Sync local mode when authMode changes externally
  useState(() => {
    setMode(authMode)
  })

  const onPickFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image too large', { description: 'Please use an image under 4MB' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, profilePicture: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const submitRegister = async () => {
    if (!form.email || !form.password || !form.fullName || !form.matricNumber || !form.level || !form.department) {
      toast.error('All fields are required')
      return
    }
    if (!form.referralCode.trim()) {
      toast.error('A referral code from an existing UNI MART student is required to join')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setBusy(true)
    const { data, error } = await api('/api/auth/register', { method: 'POST', body: form })
    setBusy(false)
    if (error) {
      toast.error('Registration failed', { description: error })
      return
    }
    setUser(data.user)
    storeToast({ title: `Welcome, ${data.user.fullName.split(' ')[0]}!`, description: 'Your UNI MART account is ready.', variant: 'success' })
    onOpenChange(false)
    setView({ name: 'home' })
  }

  const [twoFactorPending, setTwoFactorPending] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')

  const submitLogin = async () => {
    if (!form.email || !form.password) {
      toast.error('Email and password are required')
      return
    }
    setBusy(true)
    const { data, error } = await api('/api/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
    setBusy(false)
    if (error) {
      toast.error('Login failed', { description: error })
      return
    }
    if (data.requiresTwoFactor) {
      setTwoFactorPending(data.pendingToken)
      return
    }
    setUser(data.user)
    storeToast({ title: `Welcome back, ${data.user.fullName.split(' ')[0]}!`, variant: 'success' })
    onOpenChange(false)
    setView({ name: 'home' })
  }

  const submitTwoFactor = async () => {
    if (!twoFactorPending) return
    setBusy(true)
    const { data, error } = await api('/api/auth/2fa/verify-login', { method: 'POST', body: { pendingToken: twoFactorPending, code: twoFactorCode } })
    setBusy(false)
    if (error) {
      toast.error('Verification failed', { description: error })
      return
    }
    setUser(data.user)
    storeToast({ title: `Welcome back, ${data.user.fullName.split(' ')[0]}!`, variant: 'success' })
    onOpenChange(false)
    setView({ name: 'home' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <img src="/logo.png" alt="UNI MART" className="w-12 h-12 object-contain" />
            <div>
              <DialogTitle className="text-xl">Welcome to UNI MART</DialogTitle>
              <DialogDescription className="text-sm">
                A safe, verified marketplace for Afe Babalola University students only.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Trust banner */}
        <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 flex gap-3">
          <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-primary">Why we verify every student</p>
            <p className="text-muted-foreground mt-1">
              We collect your name, matric number, level, department and a profile photo to protect you and other users of the platform from fraudulent activities. Your matric number is unique to you and confirms that you are a bona-fide ABUAD student. All data is kept confidential and is never shared with third parties.
            </p>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'register' | 'login')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Create Account</TabsTrigger>
            <TabsTrigger value="login">Sign In</TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-3 mt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Chioma Okafor" />
              </div>
              <div>
                <Label htmlFor="matric">Matric Number <span className="text-destructive">*</span></Label>
                <Input id="matric" value={form.matricNumber} onChange={(e) => setForm({ ...form, matricNumber: e.target.value.toUpperCase() })} placeholder="AHS/2021/0456" />
              </div>
              <div>
                <Label htmlFor="level">Level <span className="text-destructive">*</span></Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l} Level</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dept">Department <span className="text-destructive">*</span></Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">ABUAD Email <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="chioma.okafor@abuad.edu.ng" />
              </div>
              <div>
                <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="referralCode">Referral Code <span className="text-destructive">*</span></Label>
                <Input id="referralCode" value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })} placeholder="e.g. UM-A7X9K2" />
                <p className="text-[11px] text-muted-foreground mt-1">Ask a friend already on UNI MART for their code — find it on their Profile page.</p>
              </div>
            </div>

            <div>
              <Label>Profile Picture <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                  {form.profilePicture ? (
                    <img src={form.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Photo
                </Button>
                {form.profilePicture && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, profilePicture: '' })}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">A clear photo of your face helps other students trust you.</p>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>By creating an account you confirm that the information provided is accurate and that you are a current ABUAD student. Providing false matric information will result in immediate suspension.</p>
            </div>

            <Button onClick={submitRegister} disabled={busy} className="w-full" size="lg">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</> : 'Create Account & Start Trading'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">Sign in</button>
            </p>
          </TabsContent>

          <TabsContent value="login" className="space-y-3 mt-4">
            {twoFactorPending ? (
              <div className="space-y-3">
                <div className="text-center space-y-1">
                  <ShieldCheck className="w-8 h-8 mx-auto text-primary" />
                  <p className="font-bold">Two-factor verification</p>
                  <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                </div>
                <Input
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-lg tracking-[0.5em] font-mono"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                />
                <Button onClick={submitTwoFactor} disabled={busy || twoFactorCode.length !== 6} className="w-full" size="lg">
                  {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</> : 'Verify & Sign In'}
                </Button>
                <button
                  onClick={() => { setTwoFactorPending(null); setTwoFactorCode('') }}
                  className="text-xs text-center w-full text-muted-foreground hover:text-primary"
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
            <>
            <div className="space-y-3">
              <div>
                <Label htmlFor="loginEmail">Email</Label>
                <Input id="loginEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="chioma.okafor@abuad.edu.ng" />
              </div>
              <div>
                <Label htmlFor="loginPassword">Password</Label>
                <Input id="loginPassword" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Your password" />
              </div>
            </div>
            <Button onClick={submitLogin} disabled={busy} className="w-full" size="lg">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</> : 'Sign In'}
            </Button>
            <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="font-bold mb-1">Demo accounts</p>
              <p>Admin: <code className="bg-background px-1 rounded">admin@abuad.marketplace</code> / <code className="bg-background px-1 rounded">admin1234</code></p>
              <p>Seller: <code className="bg-background px-1 rounded">chioma.okafor@abuad.edu.ng</code> / <code className="bg-background px-1 rounded">password123</code></p>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              New here?{' '}
              <button onClick={() => setMode('register')} className="text-primary font-medium hover:underline">Create an account</button>
            </p>
            </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
