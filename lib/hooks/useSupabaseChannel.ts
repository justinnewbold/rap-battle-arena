'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface ChannelConfig {
  channelName: string
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  onPayload: (payload: RealtimePostgresChangesPayload<any>) => void
  onError?: (error: Error) => void
  onReconnect?: () => void
  enabled?: boolean
}

interface UseSupabaseChannelReturn {
  isConnected: boolean
  isReconnecting: boolean
  reconnect: () => void
}

const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 30000 // 30 seconds

export function useSupabaseChannel({
  channelName,
  table,
  filter,
  event = '*',
  onPayload,
  onError,
  onReconnect,
  enabled = true,
}: ChannelConfig): UseSupabaseChannelReturn {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setIsConnected(false)
    setIsReconnecting(false)
  }, [])

  const calculateReconnectDelay = useCallback(() => {
    // Exponential backoff with jitter
    const baseDelay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current)
    const delay = Math.min(baseDelay, MAX_RECONNECT_DELAY)
    const jitter = delay * 0.1 * Math.random()
    return delay + jitter
  }, [])

  const connect = useCallback(() => {
    if (!enabled) return

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channelConfig: Record<string, unknown> = {
      event,
      schema: 'public',
      table,
    }

    if (filter) {
      channelConfig.filter = filter
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig as any,
        (payload) => {
          try {
            onPayload(payload)
          } catch (err) {
            console.error('Error in channel payload handler:', err)
            onError?.(err instanceof Error ? err : new Error(String(err)))
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setIsReconnecting(false)
          reconnectAttemptsRef.current = 0

          if (reconnectAttemptsRef.current > 0) {
            onReconnect?.()
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false)
          console.error(`Channel ${channelName} error:`, status, err)

          // Attempt reconnection
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            setIsReconnecting(true)
            const delay = calculateReconnectDelay()
            reconnectAttemptsRef.current += 1

            console.log(`Reconnecting channel ${channelName} in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)

            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, delay)
          } else {
            setIsReconnecting(false)
            onError?.(new Error(`Failed to connect to channel ${channelName} after ${MAX_RECONNECT_ATTEMPTS} attempts`))
          }
        }
      })

    channelRef.current = channel
  }, [channelName, table, filter, event, enabled, onPayload, onError, onReconnect, calculateReconnectDelay])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    setIsReconnecting(true)
    connect()
  }, [connect])

  useEffect(() => {
    if (enabled) {
      connect()
    }

    return cleanup
  }, [enabled, connect, cleanup])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (enabled && !isConnected) {
        console.log('Network online, reconnecting channel...')
        reconnect()
      }
    }

    const handleOffline = () => {
      console.log('Network offline')
      setIsConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enabled, isConnected, reconnect])

  return {
    isConnected,
    isReconnecting,
    reconnect,
  }
}

// Hook for presence tracking
interface PresenceState {
  odId: string
  username: string
  online_at: string
}

interface UsePresenceConfig {
  channelName: string
  userId: string
  username: string
  onSync?: (state: Record<string, PresenceState[]>) => void
  onJoin?: (key: string, currentPresences: PresenceState[], newPresences: PresenceState[]) => void
  onLeave?: (key: string, currentPresences: PresenceState[], leftPresences: PresenceState[]) => void
  enabled?: boolean
}

interface UsePresenceReturn {
  presenceState: Record<string, PresenceState[]>
  userCount: number
  isTracking: boolean
}

export function usePresence({
  channelName,
  userId,
  username,
  onSync,
  onJoin,
  onLeave,
  enabled = true,
}: UsePresenceConfig): UsePresenceReturn {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState[]>>({})
  const [isTracking, setIsTracking] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, PresenceState[]>
        setPresenceState(state)
        onSync?.(state)
      })
      .on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
        onJoin?.(key, currentPresences as unknown as PresenceState[], newPresences as unknown as PresenceState[])
      })
      .on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
        onLeave?.(key, currentPresences as unknown as PresenceState[], leftPresences as unknown as PresenceState[])
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            odId: userId,
            username,
            online_at: new Date().toISOString(),
          })
          setIsTracking(true)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsTracking(false)
    }
  }, [channelName, userId, username, enabled, onSync, onJoin, onLeave])

  const userCount = Object.keys(presenceState).length

  return {
    presenceState,
    userCount,
    isTracking,
  }
}
