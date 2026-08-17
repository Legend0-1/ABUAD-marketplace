'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Loader2, TrendingUp } from 'lucide-react'

export function AdminRevenueReport() {
  const [data, setData] = useState<{ rows: any[]; summary: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    api<{ rows: any[]; summary: any }>(`/api/admin/revenue?days=${days}`).then(({ data }) => {
      setData(data || null)
      setLoading(false)
    })
  }, [days])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Daily Revenue by Seller</h3>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="text-xs border rounded px-2 py-1 bg-background">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : !data || data.rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-16">No completed, paid-out orders in this period.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Orders paid out</p>
              <p className="text-xl font-bold">{data.summary.totalOrders}</p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Seller payouts (80%)</p>
              <p className="text-xl font-bold price-tag">₦{data.summary.platformPayoutTotal.toLocaleString()}</p>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Platform revenue (20%)</p>
              <p className="text-xl font-bold price-tag">₦{data.summary.platformServiceChargeTotal.toLocaleString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Seller</th>
                  <th className="py-2 pr-3 text-right">Orders</th>
                  <th className="py-2 pr-3 text-right">Payout (80%)</th>
                  <th className="py-2 pr-3 text-right">Service charge (20%)</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={`${r.date}|${r.sellerId}`} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 font-mono">{r.date}</td>
                    <td className="py-1.5 pr-3">{r.sellerName}</td>
                    <td className="py-1.5 pr-3 text-right">{r.orders}</td>
                    <td className="py-1.5 pr-3 text-right font-mono">₦{r.payout.toLocaleString()}</td>
                    <td className="py-1.5 pr-3 text-right font-mono">₦{r.serviceCharge.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
