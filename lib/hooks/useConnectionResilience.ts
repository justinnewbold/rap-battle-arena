'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'failed'

interface ConnectionConfig {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnect?: (attempt: number) => void
  onMaxRetriesReached?: () => void
}

interface ConnectionState {
  status: ConnectionStatus
  retryCount: number
  lastConnected: Date | null
  nextRetryAt: Date | null
}

/**
 * Hook for managing connection resilience with exponential backoff
 */
export function useConnectionResilience(config: ConnectionConfig = {}) {
  const {
    maxRetries = 10,
    baseDelay = 1000,
    maxDelay = 30000,
    onConnect,
    onDisconnect,
    onReconnect,
    onMaxRetriesReached,
  } = config

  const [state, setState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0,
    lastConnected: null,
    nextRetryAt: null,
  })

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectFnRef = useRef<(() => Promise<boolean>) | null>(null)

  // Calculate delay with exponential backoff and jitter
  const calculateDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    // Add jitter (±20%)
    const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1)
    return Math.round(exponentialDelay + jitter)
  }, [baseDelay, maxDelay])

  // Attempt to reconnect
  const attemptReconnect = useCallback(async () => {
    if (!connectFnRef.current) return

    const currentRetry = state.retryCount + 1

    if (currentRetry > maxRetries) {
      setState(prev => ({ ...prev, status: 'failed', nextRetryAt: null }))
      onMaxRetriesReached?.()
      return
    }

    setState(prev => ({
      ...prev,
      status: 'reconnecting',
      retryCount: currentRetry,
    }))

    onReconnect?.(currentRetry)

    try {
      const success = await connectFnRef.current()

      if (success) {
        setState({
          status: 'connected',
          retryCount: 0,
          lastConnected: new Date(),
          nextRetryAt: null,
        })
        onConnect?.()
      } else {
        throw new Error('Connection failed')
      }
    } catch {
      const delay = calculateDelay(currentRetry)
      const nextRetry = new Date(Date.now() + delay)

      setState(prev => ({
        ...prev,
        status: 'disconnected',
        nextRetryAt: nextRetry,
      }))

      retryTimeoutRef.current = setTimeout(attemptReconnect, delay)
    }
  }, [state.retryCount, maxRetries, calculateDelay, onConnect, onReconnect, onMaxRetriesReached])

  // Initialize connection
  const connect = useCallback(async (connectFn: () => Promise<boolean>) => {
    connectFnRef.current = connectFn
    setState(prev => ({ ...prev, status: 'connecting' }))

    try {
      const success = await connectFn()

      if (success) {
        setState({
          status: 'connected',
          retryCount: 0,
          lastConnected: new Date(),
          nextRetryAt: null,
        })
        onConnect?.()
      } else {
        throw new Error('Initial connection failed')
      }
    } catch {
      setState(prev => ({ ...prev, status: 'disconnected' }))
      attemptReconnect()
    }
  }, [onConnect, attemptReconnect])

  // Handle disconnect event
  const handleDisconnect = useCallback(() => {
    if (state.status === 'connected') {
      onDisconnect?.()
      attemptReconnect()
    }
  }, [state.status, onDisconnect, attemptReconnect])

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    setState(prev => ({ ...prev, retryCount: 0 }))
    attemptReconnect()
  }, [attemptReconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    connect,
    reconnect,
    handleDisconnect,
    isConnected: state.status === 'connected',
    isReconnecting: state.status === 'reconnecting',
  }
}

/**
 * Connection quality indicator based on latency
 */
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'

export function getConnectionQuality(latencyMs: number): ConnectionQuality {
  if (latencyMs < 0) return 'unknown'
  if (latencyMs < 50) return 'excellent'
  if (latencyMs < 150) return 'good'
  if (latencyMs < 300) return 'fair'
  return 'poor'
}

/**
 * Hook for measuring connection latency
 */
export function useConnectionLatency(pingEndpoint: string, intervalMs = 5000) {
  const [latency, setLatency] = useState<number>(-1)
  const [quality, setQuality] = useState<ConnectionQuality>('unknown')

  useEffect(() => {
    let mounted = true

    const measureLatency = async () => {
      const start = performance.now()
      try {
        await fetch(pingEndpoint, { method: 'HEAD', cache: 'no-store' })
        const end = performance.now()
        const ms = Math.round(end - start)

        if (mounted) {
          setLatency(ms)
          setQuality(getConnectionQuality(ms))
        }
      } catch {
        if (mounted) {
          setLatency(-1)
          setQuality('unknown')
        }
      }
    }

    measureLatency()
    const interval = setInterval(measureLatency, intervalMs)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [pingEndpoint, intervalMs])

  return { latency, quality }
}
