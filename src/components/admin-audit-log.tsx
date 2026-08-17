'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Loader2, History } from 'lucide-react'

export function AdminAuditLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await api<{ logs: any[] }>('/api/admin/audit-log')
      setLogs(data?.logs || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
  if (logs.length === 0) return <p className="text-center text-sm text-muted-foreground py-16">No audit log entries yet.</p>

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Audit Log</h3>
        <span className="text-xs text-muted-foreground">— last {logs.length} actions</span>
      </div>
      {logs.map((l) => (
        <div key={l.id} className="text-xs border rounded px-3 py-2 flex items-start gap-2 bg-card">
          <span className="text-muted-foreground shrink-0 font-mono">{new Date(l.createdAt).toLocaleString()}</span>
          <span className="font-semibold shrink-0">{l.actorLabel}</span>
          <span className="text-muted-foreground shrink-0">→</span>
          <span className="font-mono shrink-0">{l.action}</span>
          {l.detail && <span className="text-muted-foreground truncate">{l.detail}</span>}
        </div>
      ))}
    </div>
  )
}
