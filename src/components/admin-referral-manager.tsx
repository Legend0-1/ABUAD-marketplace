'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Gift } from 'lucide-react'
import { toast } from 'sonner'

export function AdminReferralManager() {
  const [commissions, setCommissions] = useState<any[]>([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  const load = async () => {
    setLoading(true)
    const { data } = await api<{ commissions: any[]; pendingTotal: number }>(`/api/admin/referrals?status=${filter}`)
    setCommissions(data?.commissions || [])
    setPendingTotal(data?.pendingTotal || 0)
    setLoading(false)
  }
  useEffect(() => { load() }, [filter])

  const markPaid = async (id: string) => {
    const { error } = await api('/api/admin/referrals', { method: 'PATCH', body: { id, status: 'paid' } })
    if (error) { toast.error(error); return }
    toast.success('Marked as paid')
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Referral Commissions</h3>
        </div>
        {filter === 'pending' && pendingTotal > 0 && (
          <Badge className="bg-amber-500 text-white">₦{pendingTotal.toLocaleString()} owed</Badge>
        )}
      </div>

      <div className="flex gap-2 text-xs">
        {['pending', 'paid', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full border capitalize ${filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : commissions.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-16">No {filter} commissions.</p>
      ) : (
        <div className="space-y-2">
          {commissions.map((c) => (
            <div key={c.id} className="bg-card border rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium">{c.referrer.fullName} <span className="text-muted-foreground font-normal">← referred {c.referredUser.fullName}</span></p>
                <p className="text-xs text-muted-foreground">
                  Batch of 5 purchases totaling ₦{c.batchTotal.toLocaleString()} · {new Date(c.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">{c.referrer.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="price-tag">₦{c.commissionAmount.toLocaleString()}</span>
                {c.status === 'pending' && (
                  <Button size="sm" onClick={() => markPaid(c.id)}>Mark Paid</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
