'use client'

import { useStore } from '@/lib/store'
import { ChevronRight, LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  title: string
  subtitle?: string
  body: string
  footer?: React.ReactNode
}

export function PolicyPage({ icon: Icon, title, subtitle, body, footer }: Props) {
  const { setView } = useStore()

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <button onClick={() => setView({ name: 'home' })} className="hover:text-primary">Home</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{title}</span>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="amazon-accent-bar h-1.5" />
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon className="w-6 h-6 text-primary shrink-0" />
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>

          <div className="prose prose-sm max-w-none whitespace-pre-line text-sm leading-relaxed font-sans">
            {body}
          </div>
        </div>
        {footer && (
          <div className="p-4 bg-muted/50 border-t">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
