// Service Worker for Rap Battle Arena
const CACHE_NAME = 'rap-battle-arena-v1'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/leaderboard',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key)
            return caches.delete(key)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip API requests and real-time connections
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase')) {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached response if available
      if (cachedResponse) {
        // Fetch in background to update cache
        event.waitUntil(updateCache(request))
        return cachedResponse
      }

      // Otherwise fetch from network
      return fetchAndCache(request)
    })
  )
})

// Fetch and cache new requests
async function fetchAndCache(request) {
  try {
    const response = await fetch(request)

    // Only cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    // Return offline page if available
    const offlinePage = await caches.match('/offline')
    if (offlinePage) return offlinePage

    throw error
  }
}

// Update cache in background
async function updateCache(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      await cache.put(request, response)
    }
  } catch (error) {
    // Ignore network errors during background update
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data
  let url = '/dashboard'

  if (data?.type === 'battle_invite' && data?.battleId) {
    url = `/battle/${data.battleId}`
  } else if (data?.type === 'battle_result' && data?.battleId) {
    url = `/battle/replay/${data.battleId}`
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-votes') {
    event.waitUntil(syncVotes())
  } else if (event.tag === 'sync-chat') {
    event.waitUntil(syncChatMessages())
  }
})

async function syncVotes() {
  const cache = await caches.open('offline-votes')
  const requests = await cache.keys()

  for (const request of requests) {
    try {
      const response = await cache.match(request)
      const data = await response.json()

      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      await cache.delete(request)
    } catch (error) {
      console.error('[SW] Failed to sync vote:', error)
    }
  }
}

async function syncChatMessages() {
  const cache = await caches.open('offline-chat')
  const requests = await cache.keys()

  for (const request of requests) {
    try {
      const response = await cache.match(request)
      const data = await response.json()

      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      await cache.delete(request)
    } catch (error) {
      console.error('[SW] Failed to sync chat message:', error)
    }
  }
}

console.log('[SW] Service Worker loaded')
