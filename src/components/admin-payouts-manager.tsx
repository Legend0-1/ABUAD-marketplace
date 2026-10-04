'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Banknote, Loader2, RefreshCw, CheckCircle2, AlertTriangle, KeyRound, Wallet, Info,
} from 'lucide-react'
import { toast } from 'sonner'

type PayoutOrder = {
  id: string
  reference: string
  sellerPayout: number
  totalAmount: number
  payoutStatus: string
  payoutError?: string | null
  transferReference?: string | null
  acknowledgedAt?: string | null
  product?: { title?: string }
  seller?: { fullName?: string; email?: string }
  storefront?: { name?: string; bankName?: string; accountNumber?: string; accountName?: string }
}

function PayoutStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'bg-green-600 text-white',
    processing: 'bg-blue-600 text-white',
    otp_pending: 'bg-amber-500 text-white',
    failed: 'bg-red-600 text-white',
    not_started: 'bg-muted text-muted-foreground border',
  }
  const label = status === 'otp_pending' ? 'OTP needed'
    : status === 'not_started' ? 'not started'
    : status
  return <Badge className={`${map[status] || 'bg-muted text-muted-foreground border'} capitalize`}>{label}</Badge>
}

export function AdminPayoutsManager() {
  const [orders, setOrders] = useState<PayoutOrder[]>([])
  const [balance, setBalance] = useState<{ currency: string; balance: number }[] | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [otpFor, setOtpFor] = useState<string | null>(null)
  const [otp, setOtp] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await api<{ orders: PayoutOrder[]; balance: any; balanceError: string | null }>('/api/admin/payouts')
    setOrders(data?.orders || [])
    setBalance(data?.balance || null)
    setBalanceError(data?.balanceError || null)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const act = async (orderId: string, action: 'retry' | 'finalize' | 'reconcile', otpValue?: string) => {
    setBusyId(orderId)
    const { data, error } = await api<{ ok?: boolean; message?: string; needsOtp?: boolean; payoutStatus?: string }>(
      '/api/admin/payouts',
      { method: 'POST', body: { orderId, action, otp: otpValue } },
    )
    setBusyId(null)
    if (error) { toast.error(error); return }
    if (data?.needsOtp) {
      toast.message(data.message || 'This payout needs an OTP to release.')
      setOtpFor(orderId)
    } else if (data?.ok) {
      toast.success(data.message || 'Done')
      setOtpFor(null); setOtp('')
    } else {
      toast.error(data?.message || 'Could not complete the payout')
    }
    load()
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>

  const owed = orders.reduce((sum, o) => sum + (o.sellerPayout || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Banknote className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Seller Payouts</h3>
        <span className="text-xs text-muted-foreground">— acknowledged orders whose payout hasn't fully gone through</span>
        <Button size="sm" variant="ghost" className="ml-auto gap-1" onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>

      {/* Balance + how payouts work */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Settled Paystack balance</span>
          </div>
          {balance && balance.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {balance.map((b) => (
                <p key={b.currency} className="text-xl font-bold">{b.currency === 'NGN' ? '₦' : `${b.currency} `}{b.balance.toLocaleString()}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">{balanceError || 'Balance unavailable'}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">Owed to sellers below: <span className="font-medium text-foreground">₦{owed.toLocaleString()}</span></p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400 flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p><strong>Payouts stuck on "OTP needed"?</strong> Your Paystack account has "OTP for transfers" switched on, so each payout waits for a one-time code sent to your registered phone/email. Enter that code here to release it.</p>
            <p>To make payouts fully automatic, turn <strong>OTP for transfers OFF</strong> in Paystack Dashboard → Settings → Preferences. Also ensure Transfers are enabled and funds have <strong>settled</strong> (new payments settle a day later and can't be sent before then).</p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-lg">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-600" />
          <p className="font-bold">All caught up</p>
          <p className="text-sm text-muted-foreground">Every acknowledged order has been paid out to its seller.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="bg-card border rounded-lg p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{o.product?.title || 'Order'}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.reference} · to {o.seller?.fullName} · {o.storefront?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.storefront?.bankName} · {o.storefront?.accountNumber} ({o.storefront?.accountName})
                  </p>
                  {o.acknowledgedAt && (
                    <p className="text-[11px] text-muted-foreground">Acknowledged {new Date(o.acknowledgedAt).toLocaleString()}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₦{o.sellerPayout.toLocaleString()}</p>
                  <PayoutStatusBadge status={o.payoutStatus} />
                </div>
              </div>

              {o.payoutError && (
                <div className="mt-2 bg-red-50 dark:bg-red-950/30 border border-red-500/30 rounded p-2 text-xs text-red-700 dark:text-red-400 flex gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{o.payoutError}</span>
                </div>
              )}

              {/* OTP entry — shown for otp_pending orders, or after an action asks for it */}
              {(o.payoutStatus === 'otp_pending' || otpFor === o.id) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                    <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      value={otpFor === o.id ? otp : ''}
                      onChange={(e) => { setOtpFor(o.id); setOtp(e.target.value) }}
                      placeholder="Enter Paystack OTP"
                      className="h-9"
                    />
                  </div>
                  <Button size="sm" onClick={() => act(o.id, 'finalize', otp)} disabled={busyId === o.id || !(otpFor === o.id && otp.trim())}>
                    {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />} Finalize payout
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => act(o.id, 'retry')} disabled={busyId === o.id} className="gap-1">
                  {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                  {o.payoutStatus === 'otp_pending' ? 'Start fresh transfer' : 'Retry payout'}
                </Button>
                {o.transferReference && (
                  <Button size="sm" variant="ghost" onClick={() => act(o.id, 'reconcile')} disabled={busyId === o.id} className="gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Re-check status
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
