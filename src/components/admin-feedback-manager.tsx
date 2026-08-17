'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, MessageCircleHeart } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-amber-500 text-white',
  reviewed: 'bg-blue-500 text-white',
  actioned: 'bg-verified text-verified-foreground',
  archived: 'bg-gray-400 text-white',
}

export function AdminFeedbackManager() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await api<{ feedback: any[] }>('/api/admin/feedback')
    setItems(data?.feedback || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: string) => {
    await api('/api/admin/feedback', { method: 'PATCH', body: { id, status } })
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)))
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>
  if (items.length === 0) return <p className="text-center text-sm text-muted-foreground py-16">No feedback yet.</p>

  return (
    <div className="space-y-2">
      {items.map((f) => (
        <div key={f.id} className="bg-card border rounded-lg p-3 flex gap-3">
          <MessageCircleHeart className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm">{f.user?.fullName}</span>
              <Badge variant="outline" className="text-[10px] capitalize">{f.category}</Badge>
              <span className="text-[10px] text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-sm">{f.message}</p>
          </div>
          <Select value={f.status} onValueChange={(v) => updateStatus(f.id, v)}>
            <SelectTrigger className={`h-7 w-28 text-xs ${STATUS_COLORS[f.status]}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="actioned">Actioned</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}
