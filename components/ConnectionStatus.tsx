'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { ConnectionQuality, ConnectionStatus as ConnectionStatusType } from '@/lib/hooks/useConnectionResilience'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'failed'
  quality?: ConnectionQuality
  latency?: number
  retryCount?: number
  onRetry?: () => void
  className?: string
  compact?: boolean
}

export function ConnectionStatus({
  status,
  quality = 'unknown',
  latency = -1,
  retryCount = 0,
  onRetry,
  className,
  compact = false,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return quality === 'excellent' || quality === 'good'
          ? 'text-green-400'
          : quality === 'fair'
          ? 'text-yellow-400'
          : 'text-orange-400'
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-400'
      case 'disconnected':
      case 'failed':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getQualityBars = () => {
    const bars = [1, 2, 3, 4]
    const activeBars = {
      excellent: 4,
      good: 3,
      fair: 2,
      poor: 1,
      unknown: 0,
    }[quality]

    return bars.map((bar) => (
      <div
        key={bar}
        className={cn(
          'w-1 rounded-full transition-colors',
          bar <= activeBars ? 'bg-current' : 'bg-gray-600',
          bar === 1 && 'h-1',
          bar === 2 && 'h-2',
          bar === 3 && 'h-3',
          bar === 4 && 'h-4'
        )}
      />
    ))
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />
      case 'failed':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <WifiOff className="w-4 h-4" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return latency > 0 ? `${latency}ms` : 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'reconnecting':
        return `Reconnecting (${retryCount})...`
      case 'disconnected':
        return 'Disconnected'
      case 'failed':
        return 'Connection failed'
      default:
        return 'Unknown'
    }
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', getStatusColor(), className)}>
        {getStatusIcon()}
        <div className="flex items-end gap-0.5">{getQualityBars()}</div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/80 backdrop-blur',
          getStatusColor(),
          className
        )}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>

        {status === 'connected' && (
          <div className="flex items-end gap-0.5 ml-1">{getQualityBars()}</div>
        )}

        {(status === 'disconnected' || status === 'failed') && onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Floating connection status badge for battle rooms
 */
export function ConnectionBadge({
  status,
  quality,
  latency,
}: {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'failed'
  quality?: ConnectionQuality
  latency?: number
}) {
  if (status === 'connected' && quality !== 'poor') {
    return null // Don't show when everything is fine
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed top-16 right-4 z-50"
    >
      <ConnectionStatus
        status={status}
        quality={quality}
        latency={latency}
        compact={false}
      />
    </motion.div>
  )
}
