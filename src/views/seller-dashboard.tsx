'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts'
import {
  LineChart as LineChartIcon, TrendingUp, Wallet, Package, ShoppingBag,
  Receipt, Clock, ChevronRight, Store, Search, ArrowUpDown, Coins,
} from 'lucide-react'
import { CURRENCIES, formatMoney, formatMoneyCompact } from '@/lib/currency'

type Grouping = 'day' | 'week' | 'month'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#3b82f6',
  in_transit: '#6366f1',
  delivered: '#8b5cf6',
  acknowledged: '#0ea5e9',
  completed: '#22c55e',
  disputed: '#ef4444',
  refunded: '#94a3b8',
}

function isoWeek(d: Date): string {
  // Bucket key like "2026-W05" — good enough for grouping/sorting.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function bucketKey(iso: string, grouping: Grouping): string {
  const d = new Date(iso)
  if (grouping === 'day') return d.toISOString().slice(0, 10)
  if (grouping === 'month') return d.toISOString().slice(0, 7)
  return isoWeek(d)
}

export function SellerDashboardPage() {
  const { user, setUser, setView, setAuthModalOpen } = useStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [grouping, setGrouping] = useState<Grouping>('day')
  const [savingCurrency, setSavingCurrency] = useState(false)

  // Table controls
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const currency = data?.currency || user?.currency || 'NGN'

  const reload = async () => {
    setLoading(true)
    const { data: res } = await api<any>('/api/seller/dashboard')
    setData(res || null)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) { setAuthModalOpen(true); return }
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const onChangeCurrency = async (code: string) => {
    setSavingCurrency(true)
    const { data: res, error } = await api<{ user: any }>('/api/auth/me', {
      method: 'PUT',
      body: { currency: code },
    })
    setSavingCurrency(false)
    if (error) return
    if (res?.user) setUser(res.user)
    // Reflect immediately without a round-trip to the dashboard endpoint.
    setData((d: any) => (d ? { ...d, currency: code } : d))
  }

  // Build the time series from raw events, bucketed by the chosen grouping.
  // Values stay in NGN here; formatMoney/formatMoneyCompact convert for display.
  const chartData = useMemo(() => {
    const events: any[] = data?.salesEvents || []
    const map = new Map<string, { key: string; gross: number; net: number; units: number }>()
    for (const e of events) {
      const key = bucketKey(e.date, grouping)
      const cur = map.get(key) || { key, gross: 0, net: 0, units: 0 }
      cur.gross += e.gross || 0
      cur.net += e.net || 0
      cur.units += e.units || 0
      map.set(key, cur)
    }
    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((b) => ({ label: b.key, gross: b.gross, net: b.net, units: b.units }))
  }, [data, grouping])

  const statusData = useMemo(() => {
    const arr: any[] = data?.statusBreakdown || []
    return arr.map((s) => ({
      name: String(s.status).replace('_', ' '),
      status: s.status,
      value: s.count,
      amountNgn: s.amount,
    }))
  }, [data])

  const topProductData = useMemo(() => {
    const arr: any[] = data?.topProducts || []
    return arr.map((p) => ({
      title: p.title.length > 22 ? p.title.slice(0, 21) + '…' : p.title,
      fullTitle: p.title,
      gross: p.gross,
      units: p.units,
    }))
  }, [data])

  const historyRows = useMemo(() => {
    let rows: any[] = data?.history || []
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((r) =>
        r.productTitle.toLowerCase().includes(q) ||
        r.buyerName.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q))
    }
    rows = [...rows].sort((a, b) => {
      const av = sortKey === 'amount' ? a.totalAmount : new Date(a.date).getTime()
      const bv = sortKey === 'amount' ? b.totalAmount : new Date(b.date).getTime()
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return rows
  }, [data, statusFilter, search, sortKey, sortDir])

  const allStatuses = useMemo(() => {
    const s = new Set<string>((data?.history || []).map((r: any) => r.status))
    return Array.from(s)
  }, [data])

  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">Please sign in.</div>
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (!data?.hasStorefront) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Store className="w-16 h-16 mx-auto mb-3 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold">No storefront yet</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Your sales dashboard appears once you have a storefront. Set one up to start selling and tracking your sales.
        </p>
        <Button size="lg" onClick={() => setView({ name: 'setup-storefront' })}>
          <Store className="w-4 h-4 mr-2" /> Set up Storefront
        </Button>
      </div>
    )
  }

  const k = data.kpis
  const hasSales = k.ordersCount > 0

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Seller Dashboard</span>
      </div>

      {/* Header + currency selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LineChartIcon className="w-6 h-6 text-primary" /> Seller Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.storefront?.name} · sales &amp; earnings overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <Select value={currency} onValueChange={onChangeCurrency} disabled={savingCurrency}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CURRENCIES).map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Naira note — figures are stored in NGN and converted for display */}
      {currency !== 'NGN' && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 mb-4 text-xs text-muted-foreground flex gap-2">
          <Coins className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
          <span>
            Payments and payouts happen in Nigerian Naira (₦). Figures below are converted to {CURRENCIES[currency]?.name} at an approximate rate for display only.
          </span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Gross Sales" value={formatMoney(k.grossSales, currency)} sub={`${k.ordersCount} completed order${k.ordersCount === 1 ? '' : 's'}`} accent />
        <KpiCard icon={<Wallet className="w-5 h-5" />} label="Net Earnings" value={formatMoney(k.netEarnings, currency)} sub="after 20% service charge" />
        <KpiCard icon={<ShoppingBag className="w-5 h-5" />} label="Units Sold" value={k.unitsSold.toLocaleString()} sub={`avg ${formatMoney(k.avgOrderValue, currency)} / order`} />
        <KpiCard icon={<Clock className="w-5 h-5" />} label="Pending Payout" value={formatMoney(k.pendingPayout, currency)} sub="in escrow, not yet released" />
      </div>

      {/* Sales over time */}
      <div className="bg-card border rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Sales over time</h2>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as Grouping[]).map((g) => (
              <Button key={g} size="sm" variant={grouping === g ? 'default' : 'outline'} className="h-7 px-3 text-xs capitalize" onClick={() => setGrouping(g)}>
                {g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly'}
              </Button>
            ))}
          </div>
        </div>
        {hasSales && chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgba(148,163,184,0.6)" />
                <YAxis tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 11 }} width={70} stroke="rgba(148,163,184,0.6)" />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatMoney(Number(val), currency),
                    name === 'gross' ? 'Gross' : 'Net',
                  ]}
                  contentStyle={{ background: 'var(--card, #1e293b)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="gross" name="Gross" stroke="#6366f1" fill="url(#gGross)" strokeWidth={2} />
                <Area type="monotone" dataKey="net" name="Net" stroke="#22c55e" fill="url(#gNet)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="No completed sales yet. Your sales trend appears here once buyers acknowledge their orders." />
        )}
      </div>

      {/* Status donut + top products */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-bold flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-primary" /> Orders by status</h2>
          {statusData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {statusData.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, _n: any, p: any) => [`${val} order${val === 1 ? '' : 's'} · ${formatMoney(p?.payload?.amountNgn || 0, currency)}`, p?.payload?.name]}
                    contentStyle={{ background: 'var(--card, #1e293b)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="No orders yet." />
          )}
        </div>

        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-bold flex items-center gap-2 mb-3"><ShoppingBag className="w-4 h-4 text-primary" /> Top listings by sales</h2>
          {topProductData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 11 }} stroke="rgba(148,163,184,0.6)" />
                  <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={120} stroke="rgba(148,163,184,0.6)" />
                  <Tooltip
                    formatter={(val: any) => [formatMoney(Number(val), currency), 'Gross']}
                    contentStyle={{ background: 'var(--card, #1e293b)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="gross" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="No completed sales yet." />
          )}
        </div>
      </div>

      {/* Sales history table */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-bold flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> Sales history</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item, buyer, ref…" className="h-8 pl-8 w-52 text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[150px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {historyRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-3 font-medium">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => { setSortKey('date'); setSortDir((d) => sortKey === 'date' && d === 'desc' ? 'asc' : 'desc') }}>
                      Date <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium">Buyer</th>
                  <th className="py-2 pr-3 font-medium text-right">Qty</th>
                  <th className="py-2 pr-3 font-medium text-right">
                    <button className="flex items-center gap-1 hover:text-foreground ml-auto" onClick={() => { setSortKey('amount'); setSortDir((d) => sortKey === 'amount' && d === 'desc' ? 'asc' : 'desc') }}>
                      Total <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 pr-3 font-medium text-right">Payout</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="py-2 pr-3 max-w-[220px] truncate" title={r.productTitle}>{r.productTitle}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.buyerName}</td>
                    <td className="py-2 pr-3 text-right">{r.quantity}</td>
                    <td className="py-2 pr-3 text-right font-medium">{formatMoney(r.totalAmount, currency)}</td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">{formatMoney(r.sellerPayout, currency)}</td>
                    <td className="py-2 pr-3">
                      <Badge className="capitalize text-white" style={{ backgroundColor: STATUS_COLORS[r.status] || '#94a3b8' }}>
                        {r.status.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-muted-foreground">
            {(data?.history || []).length === 0 ? 'No orders yet. Sales will appear here as buyers purchase your listings.' : 'No orders match your filters.'}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, accent }: { icon: ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
      <div className={`flex items-center gap-2 text-xs font-medium ${accent ? 'text-primary' : 'text-muted-foreground'}`}>
        {icon} {label}
      </div>
      <p className="text-2xl font-black mt-1.5 truncate" title={value}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-56 flex items-center justify-center text-center text-sm text-muted-foreground px-6">
      {label}
    </div>
  )
}
