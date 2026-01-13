'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  isUpdateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdateAvailable: false,
    registration: null,
  })

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  // Check if app is installed
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isIOSInstalled = isIOS && (navigator as Navigator & { standalone?: boolean }).standalone === true

    setState(prev => ({
      ...prev,
      isInstalled: isStandalone || isIOSInstalled,
    }))
  }, [])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState(prev => ({ ...prev, isInstallable: true }))
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
      }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Register service worker
  useEffect(() => {
    let registration: ServiceWorkerRegistration | null = null
    let updateFoundHandler: (() => void) | null = null
    let stateChangeHandler: (() => void) | null = null
    let newWorkerRef: ServiceWorker | null = null

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          registration = reg
          setState(prev => ({ ...prev, registration: reg }))

          // Check for updates
          updateFoundHandler = () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorkerRef = newWorker
              stateChangeHandler = () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, isUpdateAvailable: true }))
                }
              }
              newWorker.addEventListener('statechange', stateChangeHandler)
            }
          }
          reg.addEventListener('updatefound', updateFoundHandler)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }

    return () => {
      // Clean up event listeners to prevent memory leaks
      if (registration && updateFoundHandler) {
        registration.removeEventListener('updatefound', updateFoundHandler)
      }
      if (newWorkerRef && stateChangeHandler) {
        newWorkerRef.removeEventListener('statechange', stateChangeHandler)
      }
    }
  }, [])

  // Install app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice

      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null)
        setState(prev => ({
          ...prev,
          isInstallable: false,
          isInstalled: true,
        }))
        return true
      }
      return false
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }, [deferredPrompt])

  // Update app
  const updateApp = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }, [state.registration])

  // Request push notification permission
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    const permission = await Notification.requestPermission()
    return permission
  }, [])

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.registration) return null

    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured')
        return null
      }

      const subscription = await state.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      return subscription
    } catch (error) {
      console.error('Push subscription failed:', error)
      return null
    }
  }, [state.registration])

  return {
    ...state,
    installApp,
    updateApp,
    requestNotificationPermission,
    subscribeToPush,
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  }
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as Uint8Array<ArrayBuffer>
}
