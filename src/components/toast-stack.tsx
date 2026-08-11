'use client'

import { useStore } from '@/lib/store'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'

export function ToastStack() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg shadow-lg border p-3 pr-9 relative bg-card flex gap-3 animate-in slide-in-from-right ${
            t.variant === 'success' ? 'border-green-500/40 bg-green-50 dark:bg-green-950/30'
            : t.variant === 'error' ? 'border-red-500/40 bg-red-50 dark:bg-red-950/30'
            : 'border-border'
          }`}
        >
          {t.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
          {t.variant === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
          {(!t.variant || t.variant === 'default') && <Info className="w-5 h-5 text-primary shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{t.title}</p>
            {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="absolute top-2 right-2 p-1 hover:bg-muted rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
