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

// Chart loading placeholder with skeleton
function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-dark-800/50 rounded-lg"
      style={{ height }}
    >
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-dark-500" />
      </div>
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

// Lazy load ReplayPlayer - heavy video/audio component
export const LazyReplayPlayer = dynamic(
  () => import('@/components/ReplayPlayer').then(mod => ({ default: mod.ReplayPlayer })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

// Lazy load TrainingMode - complex interactive component
export const LazyTrainingMode = dynamic(
  () => import('@/components/TrainingMode').then(mod => ({ default: mod.TrainingMode })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

// Lazy load Analytics Charts (uses heavy recharts library)
export const LazyEloHistoryChart = dynamic(
  () => import('@/components/analytics').then(mod => ({ default: mod.EloHistoryChart })),
  {
    loading: () => <ChartSkeleton height={200} />,
    ssr: false,
  }
)

export const LazyWinRateTrendChart = dynamic(
  () => import('@/components/analytics').then(mod => ({ default: mod.WinRateTrendChart })),
  {
    loading: () => <ChartSkeleton height={200} />,
    ssr: false,
  }
)

export const LazySkillRadarChart = dynamic(
  () => import('@/components/analytics').then(mod => ({ default: mod.SkillRadarChart })),
  {
    loading: () => <ChartSkeleton height={250} />,
    ssr: false,
  }
)

export const LazyHeadToHeadChart = dynamic(
  () => import('@/components/analytics').then(mod => ({ default: mod.HeadToHeadChart })),
  {
    loading: () => <ChartSkeleton height={200} />,
    ssr: false,
  }
)

export const LazyScoreDistributionChart = dynamic(
  () => import('@/components/analytics').then(mod => ({ default: mod.ScoreDistributionChart })),
  {
    loading: () => <ChartSkeleton height={200} />,
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
