'use client'

import { useEffect, useState, useCallback } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isOnline: boolean
  registration: ServiceWorkerRegistration | null
  error: Error | null
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    registration: null,
    error: null,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isSupported = 'serviceWorker' in navigator

    setState(prev => ({ ...prev, isSupported }))

    if (!isSupported) return

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }))

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60000) // Check every minute
      })
      .catch((error) => {
        setState(prev => ({ ...prev, error }))
        console.error('Service Worker registration failed:', error)
      })

    // Online/offline status
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return state
}

// Hook for push notifications
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    setPermission(Notification.permission)
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return 'denied'
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const subscribe = useCallback(async (vapidPublicKey: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported')
    }

    const registration = await navigator.serviceWorker.ready

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    setSubscription(sub)
    return sub
  }, [])

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe()
      setSubscription(null)
    }
  }, [subscription])

  return {
    permission,
    subscription,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    requestPermission,
    subscribe,
    unsubscribe,
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// Hook for background sync
export function useBackgroundSync() {
  const queueAction = useCallback(async (tag: string, data: unknown) => {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
      // Fall back to immediate action
      return false
    }

    try {
      // Store action in IndexedDB or cache
      const cache = await caches.open(`offline-${tag}`)
      const request = new Request(`/${tag}/${Date.now()}`)
      const response = new Response(JSON.stringify(data))
      await cache.put(request, response)

      // Register sync
      const registration = await navigator.serviceWorker.ready
      await (registration as any).sync.register(`sync-${tag}`)

      return true
    } catch (error) {
      console.error('Failed to queue background sync:', error)
      return false
    }
  }, [])

  return { queueAction }
}
