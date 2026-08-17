'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, ScrollText } from 'lucide-react'
import { toast } from 'sonner'

export function AdminAgreementManager() {
  const [agreement, setAgreement] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [serviceCharge, setServiceCharge] = useState('20')
  const [notify, setNotify] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await api<{ agreement: any }>('/api/agreement')
      if (data?.agreement) {
        setAgreement(data.agreement)
        setTitle(data.agreement.title)
        setBody(data.agreement.body)
        setServiceCharge(String(data.agreement.serviceChargePercent))
      }
      setLoading(false)
    })()
  }, [])

  const save = async () => {
    setSaving(true)
    const { data, error } = await api('/api/admin/agreement', {
      method: 'PATCH',
      body: { title, body, serviceChargePercent: Number(serviceCharge), notifySellers: notify },
    })
    setSaving(false)
    if (error) { toast.error(error); return }
    toast.success(`Published as v${data.agreement.version}`, {
      description: notify ? 'All active sellers have been notified in their inbox.' : undefined,
    })
    setAgreement(data.agreement)
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-bold">Seller Agreement</h3>
          <p className="text-xs text-muted-foreground">Currently active: v{agreement?.version || '—'}. Saving publishes a new version and deactivates the old one.</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Service charge %</Label>
        <Input type="number" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} className="max-w-32" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Body (markdown-style — # headings, ** bold ** supported in rendering)</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="font-mono text-xs" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Notify all active sellers via inbox when published
      </label>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Publish New Version
      </Button>
    </div>
  )
}
