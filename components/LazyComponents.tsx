'use client'

import dynamic from 'next/dynamic'
import { ComponentType, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

// Loading fallback component
function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size]

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={`${sizeClass} animate-spin text-fire-500`} />
    </div>
  )
}

// Lazy load SpectatorChat - heavy component with real-time subscriptions
export const LazySpectatorChat = dynamic(
  () => import('@/components/SpectatorChat'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

// Lazy load AudioWaveform - uses Web Audio API
export const LazyAudioWaveform = dynamic(
  () => import('@/components/AudioWaveform').then(mod => ({ default: mod.AudioWaveform })),
  {
    loading: () => <LoadingSpinner size="sm" />,
    ssr: false,
  }
)

// Higher-order component for lazy loading any component
export function withLazyLoad<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode
) {
  return dynamic(importFn, {
    loading: () => <>{fallback || <LoadingSpinner />}</>,
    ssr: false,
  })
}
