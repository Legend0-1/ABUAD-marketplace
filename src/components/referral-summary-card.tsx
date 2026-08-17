'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Gift, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ReferralSummaryCard() {
  const [data, setData] = useState<{ referralCode: string; referralCount: number; totalEarned: number; totalPaid: number; totalPending: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<any>('/api/referral/me').then(({ data }) => {
      setData(data)
      setLoading(false)
    })
  }, [])

  const copy = () => {
    if (!data?.referralCode) return
    navigator.clipboard.writeText(data.referralCode)
    toast.success('Referral code copied')
  }

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div>
  if (!data?.referralCode) return null

  return (
    <div className="bg-card border rounded-lg p-4 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="font-bold">Your Referral Code</h2>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="price-tag price-tag-outline text-base">{data.referralCode}</span>
        <Button size="sm" variant="outline" onClick={copy} className="gap-1"><Copy className="w-3.5 h-3.5" /> Copy</Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Share this with a student joining UNI MART — they'll enter it when they sign up. For every 5 completed purchases they make, you earn 5% of that batch's total.
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold">{data.referralCount}</p>
          <p className="text-xs text-muted-foreground">Referred</p>
        </div>
        <div>
          <p className="text-lg font-bold">₦{data.totalPending.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div>
          <p className="text-lg font-bold">₦{data.totalPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Paid Out</p>
        </div>
      </div>
    </div>
  )
}
