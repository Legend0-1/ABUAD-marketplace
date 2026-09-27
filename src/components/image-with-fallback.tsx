'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ImageOff } from 'lucide-react'

type Props = {
  src?: string | null
  alt: string
  className?: string
  /** Optional icon element shown inside the gradient fallback. */
  fallbackIcon?: React.ReactNode
  /** Extra classes for the <img> element specifically. */
  imgClassName?: string
}

/**
 * An <img> that degrades gracefully. If the remote photo fails to load (common
 * with hotlinked stock images), it fades to a cinematic gradient + an icon
 * instead of showing a broken-image glyph. Keeps the dark UI looking finished.
 */
export function ImageWithFallback({ src, alt, className, imgClassName, fallbackIcon }: Props) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!src || failed) {
    return (
      <div className={cn('poster-fallback flex items-center justify-center text-white/40', className)}>
        {fallbackIcon ?? <ImageOff className="w-8 h-8" />}
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!loaded && <div className="absolute inset-0 poster-fallback animate-pulse" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </div>
  )
}
