'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface QueuedAction {
  id: string
  type: string
  payload: unknown
  timestamp: number
  retries: number
}

interface OfflineQueueConfig {
  storageKey?: string
  maxRetries?: number
  onSync?: (action: QueuedAction) => Promise<boolean>
  onSyncComplete?: (successful: number, failed: number) => void
}

/**
 * Hook for managing offline action queue with automatic sync
 */
export function useOfflineQueue(config: OfflineQueueConfig = {}) {
  const {
    storageKey = 'offline-queue',
    maxRetries = 3,
    onSync,
    onSyncComplete,
  } = config

  const [queue, setQueue] = useState<QueuedAction[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const syncingRef = useRef(false)

  // Load queue from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setQueue(JSON.parse(stored))
      }
    } catch {
      console.error('Failed to load offline queue')
    }
  }, [storageKey])

  // Save queue to storage on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(queue))
    } catch {
      console.error('Failed to save offline queue')
    }
  }, [queue, storageKey])

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Add action to queue
  const enqueue = useCallback((type: string, payload: unknown) => {
    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    }

    setQueue(prev => [...prev, action])
    return action.id
  }, [])

  // Remove action from queue
  const dequeue = useCallback((id: string) => {
    setQueue(prev => prev.filter(action => action.id !== id))
  }, [])

  // Process queue
  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !onSync || queue.length === 0) return

    syncingRef.current = true
    setIsSyncing(true)

    let successful = 0
    let failed = 0

    for (const action of [...queue]) {
      try {
        const success = await onSync(action)

        if (success) {
          dequeue(action.id)
          successful++
        } else {
          throw new Error('Sync failed')
        }
      } catch {
        if (action.retries >= maxRetries) {
          dequeue(action.id)
          failed++
        } else {
          setQueue(prev =>
            prev.map(a =>
              a.id === action.id ? { ...a, retries: a.retries + 1 } : a
            )
          )
        }
      }
    }

    setIsSyncing(false)
    syncingRef.current = false

    if (successful > 0 || failed > 0) {
      onSyncComplete?.(successful, failed)
    }
  }, [queue, onSync, maxRetries, dequeue, onSyncComplete])

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue()
    }
  }, [isOnline, queue.length, syncQueue])

  // Clear all queued actions
  const clearQueue = useCallback(() => {
    setQueue([])
    localStorage.removeItem(storageKey)
  }, [storageKey])

  return {
    queue,
    enqueue,
    dequeue,
    syncQueue,
    clearQueue,
    isSyncing,
    isOnline,
    pendingCount: queue.length,
  }
}

/**
 * Pre-configured queue for battle votes
 */
export function useVoteQueue() {
  return useOfflineQueue({
    storageKey: 'offline-votes',
    maxRetries: 5,
    onSync: async (action) => {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      })
      return response.ok
    },
  })
}

/**
 * Pre-configured queue for chat messages
 */
export function useChatQueue() {
  return useOfflineQueue({
    storageKey: 'offline-chat',
    maxRetries: 3,
    onSync: async (action) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      })
      return response.ok
    },
  })
}
