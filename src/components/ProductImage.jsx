import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export default function ProductImage({ src, alt, className, fallbackClassName, imgClassName }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={cn('grid place-items-center bg-slate-100 text-xs text-muted-foreground', className, fallbackClassName)}>
        Image unavailable
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt || 'Product'}
      className={cn(className, imgClassName)}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}
