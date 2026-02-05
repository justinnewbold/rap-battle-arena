// Technical & Infrastructure Features
// Offline Mode, WebRTC Fallback, CDN Management, Background Workers, Database Optimization

import { supabase } from './supabase'

// ===========================================
// OFFLINE MODE - Service Worker & IndexedDB
// ===========================================

export interface CachedBattle {
  id: string
  data: any
  cachedAt: number
  expiresAt: number
}

export interface OfflineAction {
  id: string
  type: 'vote' | 'comment' | 'reaction' | 'challenge'
  payload: any
  createdAt: number
  synced: boolean
}

const DB_NAME = 'rap-battle-offline'
const DB_VERSION = 1
const BATTLE_STORE = 'battles'
const ACTION_STORE = 'offline_actions'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

// Initialize IndexedDB
export function initOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Battles store
      if (!db.objectStoreNames.contains(BATTLE_STORE)) {
        const battleStore = db.createObjectStore(BATTLE_STORE, { keyPath: 'id' })
        battleStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }

      // Offline actions store
      if (!db.objectStoreNames.contains(ACTION_STORE)) {
        const actionStore = db.createObjectStore(ACTION_STORE, { keyPath: 'id' })
        actionStore.createIndex('synced', 'synced', { unique: false })
        actionStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

// Cache a battle for offline viewing
export async function cacheBattleOffline(battleId: string, battleData: any): Promise<void> {
  const db = await initOfflineDB()
  const transaction = db.transaction(BATTLE_STORE, 'readwrite')
  const store = transaction.objectStore(BATTLE_STORE)

  const cached: CachedBattle = {
    id: battleId,
    data: battleData,
    cachedAt: Date.now(),
    expiresAt: Date.now() + CACHE_DURATION
  }

  store.put(cached)
}

// Get cached battle
export async function getCachedBattle(battleId: string): Promise<any | null> {
  const db = await initOfflineDB()
  const transaction = db.transaction(BATTLE_STORE, 'readonly')
  const store = transaction.objectStore(BATTLE_STORE)

  return new Promise((resolve) => {
    const request = store.get(battleId)
    request.onsuccess = () => {
      const result = request.result as CachedBattle | undefined
      if (result && result.expiresAt > Date.now()) {
        resolve(result.data)
      } else {
        resolve(null)
      }
    }
    request.onerror = () => resolve(null)
  })
}

// Get all cached battles
export async function getAllCachedBattles(): Promise<CachedBattle[]> {
  const db = await initOfflineDB()
  const transaction = db.transaction(BATTLE_STORE, 'readonly')
  const store = transaction.objectStore(BATTLE_STORE)

  return new Promise((resolve) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const battles = (request.result as CachedBattle[])
        .filter(b => b.expiresAt > Date.now())
        .sort((a, b) => b.cachedAt - a.cachedAt)
      resolve(battles)
    }
    request.onerror = () => resolve([])
  })
}

// Queue offline action
export async function queueOfflineAction(
  type: OfflineAction['type'],
  payload: any
): Promise<string> {
  const db = await initOfflineDB()
  const transaction = db.transaction(ACTION_STORE, 'readwrite')
  const store = transaction.objectStore(ACTION_STORE)

  const action: OfflineAction = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    createdAt: Date.now(),
    synced: false
  }

  store.add(action)
  return action.id
}

// Sync offline actions when back online
export async function syncOfflineActions(): Promise<{ synced: number; failed: number }> {
  const db = await initOfflineDB()
  const transaction = db.transaction(ACTION_STORE, 'readwrite')
  const store = transaction.objectStore(ACTION_STORE)
  const index = store.index('synced')

  return new Promise((resolve) => {
    const request = index.getAll(IDBKeyRange.only(false))
    request.onsuccess = async () => {
      const actions = request.result as OfflineAction[]
      let synced = 0
      let failed = 0

      for (const action of actions) {
        try {
          await processOfflineAction(action)
          // Mark as synced
          action.synced = true
          store.put(action)
          synced++
        } catch (error) {
          console.error('Failed to sync action:', error)
          failed++
        }
      }

      resolve({ synced, failed })
    }
    request.onerror = () => resolve({ synced: 0, failed: 0 })
  })
}

// Process individual offline action
async function processOfflineAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case 'vote':
      await supabase.from('votes').insert(action.payload)
      break
    case 'comment':
      await supabase.from('comments').insert(action.payload)
      break
    case 'reaction':
      await supabase.from('reactions').insert(action.payload)
      break
    case 'challenge':
      await supabase.from('battle_challenges').insert(action.payload)
      break
  }
}

// Clear expired cache
export async function clearExpiredCache(): Promise<number> {
  const db = await initOfflineDB()
  const transaction = db.transaction(BATTLE_STORE, 'readwrite')
  const store = transaction.objectStore(BATTLE_STORE)

  return new Promise((resolve) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const battles = request.result as CachedBattle[]
      let cleared = 0

      for (const battle of battles) {
        if (battle.expiresAt <= Date.now()) {
          store.delete(battle.id)
          cleared++
        }
      }

      resolve(cleared)
    }
    request.onerror = () => resolve(0)
  })
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine
}

// Online/offline event listeners
export function setupConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

// ===========================================
// WEBRTC FALLBACK
// ===========================================

export interface PeerConnection {
  id: string
  peerId: string
  connection: RTCPeerConnection
  dataChannel: RTCDataChannel | null
  mediaStream: MediaStream | null
  status: 'connecting' | 'connected' | 'disconnected' | 'failed'
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[]
  battleId: string
  userId: string
  onTrack?: (stream: MediaStream) => void
  onDataMessage?: (message: any) => void
  onConnectionChange?: (status: PeerConnection['status']) => void
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
]

// Create WebRTC peer connection
export function createPeerConnection(config: WebRTCConfig): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: config.iceServers || DEFAULT_ICE_SERVERS
  })

  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      // Send ICE candidate through signaling server (Supabase realtime)
      await supabase.channel(`battle:${config.battleId}`).send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: {
          candidate: event.candidate,
          from: config.userId
        }
      })
    }
  }

  pc.ontrack = (event) => {
    if (config.onTrack && event.streams[0]) {
      config.onTrack(event.streams[0])
    }
  }

  pc.onconnectionstatechange = () => {
    const status = pc.connectionState as PeerConnection['status']
    if (config.onConnectionChange) {
      config.onConnectionChange(status)
    }
  }

  return pc
}

// Create offer for WebRTC connection
export async function createOffer(
  pc: RTCPeerConnection,
  battleId: string,
  userId: string
): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: false
  })

  await pc.setLocalDescription(offer)

  // Send offer through signaling
  await supabase.channel(`battle:${battleId}`).send({
    type: 'broadcast',
    event: 'offer',
    payload: {
      offer,
      from: userId
    }
  })

  return offer
}

// Handle incoming offer
export async function handleOffer(
  pc: RTCPeerConnection,
  offer: RTCSessionDescriptionInit,
  battleId: string,
  userId: string
): Promise<RTCSessionDescriptionInit> {
  await pc.setRemoteDescription(new RTCSessionDescription(offer))

  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)

  // Send answer through signaling
  await supabase.channel(`battle:${battleId}`).send({
    type: 'broadcast',
    event: 'answer',
    payload: {
      answer,
      from: userId
    }
  })

  return answer
}

// Handle incoming answer
export async function handleAnswer(
  pc: RTCPeerConnection,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(answer))
}

// Add ICE candidate
export async function addIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  await pc.addIceCandidate(new RTCIceCandidate(candidate))
}

// Add local media stream
export async function addLocalStream(
  pc: RTCPeerConnection,
  stream: MediaStream
): Promise<void> {
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream)
  })
}

// Create data channel for battle sync
export function createDataChannel(
  pc: RTCPeerConnection,
  label: string = 'battle-sync'
): RTCDataChannel {
  const channel = pc.createDataChannel(label, {
    ordered: true
  })

  return channel
}

// Setup WebRTC signaling listener
export function setupSignalingListener(
  battleId: string,
  userId: string,
  handlers: {
    onOffer: (offer: RTCSessionDescriptionInit, from: string) => void
    onAnswer: (answer: RTCSessionDescriptionInit, from: string) => void
    onIceCandidate: (candidate: RTCIceCandidateInit, from: string) => void
  }
): () => void {
  const channel = supabase.channel(`battle:${battleId}`)

  channel
    .on('broadcast', { event: 'offer' }, ({ payload }) => {
      if (payload.from !== userId) {
        handlers.onOffer(payload.offer, payload.from)
      }
    })
    .on('broadcast', { event: 'answer' }, ({ payload }) => {
      if (payload.from !== userId) {
        handlers.onAnswer(payload.answer, payload.from)
      }
    })
    .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
      if (payload.from !== userId) {
        handlers.onIceCandidate(payload.candidate, payload.from)
      }
    })
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}

// ===========================================
// CDN MANAGEMENT
// ===========================================

export interface CDNConfig {
  provider: 'cloudflare' | 's3' | 'bunny'
  baseUrl: string
  bucket: string
}

export interface UploadResult {
  success: boolean
  url: string | null
  error: string | null
  size: number
  duration?: number
}

// Default CDN config (would be env variables in production)
const CDN_CONFIG: CDNConfig = {
  provider: 'cloudflare',
  baseUrl: process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.rapbattlearena.com',
  bucket: 'battle-recordings'
}

// Generate CDN URL for asset
export function getCDNUrl(path: string, options?: { width?: number; quality?: number }): string {
  let url = `${CDN_CONFIG.baseUrl}/${path}`

  if (options) {
    const params = new URLSearchParams()
    if (options.width) params.set('w', options.width.toString())
    if (options.quality) params.set('q', options.quality.toString())
    if (params.toString()) {
      url += `?${params.toString()}`
    }
  }

  return url
}

// Generate signed upload URL
export async function getSignedUploadUrl(
  filename: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<{ url: string; fields: Record<string, string> } | null> {
  const { data, error } = await supabase.functions.invoke('generate-upload-url', {
    body: { filename, contentType, expiresIn }
  })

  if (error) {
    console.error('Error generating upload URL:', error)
    return null
  }

  return data
}

// Upload audio to CDN
export async function uploadAudioToCDN(
  audioBlob: Blob,
  battleId: string,
  roundNumber: number,
  userId: string
): Promise<UploadResult> {
  const filename = `battles/${battleId}/round-${roundNumber}-${userId}.webm`

  try {
    const signedUrl = await getSignedUploadUrl(filename, 'audio/webm')
    if (!signedUrl) {
      return { success: false, url: null, error: 'Failed to get upload URL', size: 0 }
    }

    const formData = new FormData()
    Object.entries(signedUrl.fields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('file', audioBlob)

    const response = await fetch(signedUrl.url, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      return { success: false, url: null, error: 'Upload failed', size: 0 }
    }

    return {
      success: true,
      url: getCDNUrl(filename),
      error: null,
      size: audioBlob.size
    }
  } catch (error) {
    return {
      success: false,
      url: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      size: 0
    }
  }
}

// Preload audio for faster playback
export function preloadAudio(urls: string[]): void {
  urls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'audio'
    link.href = url
    document.head.appendChild(link)
  })
}

// ===========================================
// BACKGROUND WORKERS
// ===========================================

export interface BackgroundJob {
  id: string
  type: 'transcribe' | 'judge' | 'analytics' | 'notification' | 'cleanup'
  payload: any
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'processing' | 'complete' | 'failed'
  attempts: number
  maxAttempts: number
  result: any | null
  error: string | null
  createdAt: string
  processedAt: string | null
}

// Queue a background job
export async function queueBackgroundJob(
  type: BackgroundJob['type'],
  payload: any,
  priority: BackgroundJob['priority'] = 'normal'
): Promise<string | null> {
  const { data, error } = await supabase
    .from('background_jobs')
    .insert({
      type,
      payload,
      priority,
      status: 'pending',
      attempts: 0,
      max_attempts: 3
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error queuing job:', error)
    return null
  }

  return data.id
}

// Get job status
export async function getJobStatus(jobId: string): Promise<BackgroundJob | null> {
  const { data, error } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) {
    return null
  }

  return data
}

// Wait for job completion
export async function waitForJob(
  jobId: string,
  timeoutMs: number = 30000,
  pollIntervalMs: number = 1000
): Promise<BackgroundJob | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const job = await getJobStatus(jobId)

    if (job && (job.status === 'complete' || job.status === 'failed')) {
      return job
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  return null
}

// Queue transcription job
export async function queueTranscription(
  battleId: string,
  roundNumber: number,
  audioUrl: string
): Promise<string | null> {
  return queueBackgroundJob('transcribe', {
    battleId,
    roundNumber,
    audioUrl
  }, 'high')
}

// Queue AI judging job
export async function queueJudging(
  battleId: string,
  roundNumber: number,
  transcript: string,
  opponentTranscript?: string
): Promise<string | null> {
  return queueBackgroundJob('judge', {
    battleId,
    roundNumber,
    transcript,
    opponentTranscript
  }, 'high')
}

// Queue analytics processing
export async function queueAnalyticsUpdate(userId: string): Promise<string | null> {
  return queueBackgroundJob('analytics', { userId }, 'low')
}

// ===========================================
// DATABASE OPTIMIZATION
// ===========================================

export interface QueryStats {
  query: string
  avgExecutionTime: number
  callCount: number
  lastCalled: string
}

export interface IndexRecommendation {
  table: string
  columns: string[]
  reason: string
  estimatedImprovement: string
}

// Recommended indexes for common queries
export const RECOMMENDED_INDEXES: IndexRecommendation[] = [
  {
    table: 'battles',
    columns: ['status', 'created_at'],
    reason: 'Leaderboard and active battles queries',
    estimatedImprovement: '60-80% faster'
  },
  {
    table: 'battles',
    columns: ['player1_id', 'status'],
    reason: 'User battle history queries',
    estimatedImprovement: '50-70% faster'
  },
  {
    table: 'battles',
    columns: ['player2_id', 'status'],
    reason: 'User battle history queries',
    estimatedImprovement: '50-70% faster'
  },
  {
    table: 'battle_rounds',
    columns: ['battle_id', 'round_number'],
    reason: 'Battle round lookups',
    estimatedImprovement: '70-90% faster'
  },
  {
    table: 'profiles',
    columns: ['elo_rating'],
    reason: 'Leaderboard sorting',
    estimatedImprovement: '80-95% faster'
  },
  {
    table: 'matchmaking_queue',
    columns: ['status', 'elo_range', 'created_at'],
    reason: 'Matchmaking queries',
    estimatedImprovement: '70-85% faster'
  },
  {
    table: 'notifications',
    columns: ['user_id', 'read', 'created_at'],
    reason: 'Notification fetching',
    estimatedImprovement: '60-80% faster'
  },
  {
    table: 'follows',
    columns: ['follower_id'],
    reason: 'Following list queries',
    estimatedImprovement: '50-70% faster'
  },
  {
    table: 'follows',
    columns: ['following_id'],
    reason: 'Follower list queries',
    estimatedImprovement: '50-70% faster'
  }
]

// Generate SQL for recommended indexes
export function generateIndexSQL(): string {
  return RECOMMENDED_INDEXES.map(rec => {
    const indexName = `idx_${rec.table}_${rec.columns.join('_')}`
    return `CREATE INDEX IF NOT EXISTS ${indexName} ON ${rec.table} (${rec.columns.join(', ')});`
  }).join('\n')
}

// Optimized queries with proper indexes
export const OPTIMIZED_QUERIES = {
  // Leaderboard with pagination
  leaderboard: `
    SELECT p.*,
           ROW_NUMBER() OVER (ORDER BY p.elo_rating DESC) as rank
    FROM profiles p
    WHERE p.elo_rating IS NOT NULL
    ORDER BY p.elo_rating DESC
    LIMIT $1 OFFSET $2
  `,

  // Active battles for matchmaking
  activeBattles: `
    SELECT b.*,
           p1.username as player1_name,
           p2.username as player2_name
    FROM battles b
    LEFT JOIN profiles p1 ON b.player1_id = p1.id
    LEFT JOIN profiles p2 ON b.player2_id = p2.id
    WHERE b.status IN ('waiting', 'ready', 'battling')
    ORDER BY b.created_at DESC
    LIMIT $1
  `,

  // User battle history
  userBattles: `
    SELECT b.*,
           CASE WHEN b.winner_id = $1 THEN 'win'
                WHEN b.winner_id IS NULL THEN 'draw'
                ELSE 'loss' END as result
    FROM battles b
    WHERE (b.player1_id = $1 OR b.player2_id = $1)
      AND b.status = 'complete'
    ORDER BY b.completed_at DESC
    LIMIT $2 OFFSET $3
  `,

  // Matchmaking candidates
  matchmakingCandidates: `
    SELECT q.*, p.username, p.elo_rating
    FROM matchmaking_queue q
    JOIN profiles p ON q.user_id = p.id
    WHERE q.status = 'searching'
      AND q.user_id != $1
      AND p.elo_rating BETWEEN $2 AND $3
    ORDER BY q.created_at ASC
    LIMIT 10
  `
}

// Connection pooling configuration
export const DB_POOL_CONFIG = {
  min: 2,
  max: 10,
  idleTimeoutMs: 30000,
  connectionTimeoutMs: 5000,
  statementTimeout: 10000
}

// Query performance monitoring
export async function logQueryPerformance(
  query: string,
  executionTimeMs: number
): Promise<void> {
  if (executionTimeMs > 1000) {
    console.warn(`Slow query detected (${executionTimeMs}ms):`, query.substring(0, 100))

    // Log to analytics
    await supabase.from('query_performance_logs').insert({
      query: query.substring(0, 500),
      execution_time_ms: executionTimeMs,
      logged_at: new Date().toISOString()
    })
  }
}

// Batch operations helper
export async function batchInsert<T extends Record<string, any>>(
  table: string,
  records: T[],
  batchSize: number = 100
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0
  let errors = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)

    if (error) {
      errors += batch.length
      console.error(`Batch insert error:`, error)
    } else {
      inserted += batch.length
    }
  }

  return { inserted, errors }
}

// Vacuum and analyze tables (would be called by admin/cron)
export function getMaintenanceSQL(): string {
  return `
    -- Vacuum and analyze frequently updated tables
    VACUUM ANALYZE battles;
    VACUUM ANALYZE battle_rounds;
    VACUUM ANALYZE matchmaking_queue;
    VACUUM ANALYZE notifications;
    VACUUM ANALYZE profiles;

    -- Reindex for performance
    REINDEX TABLE battles;
    REINDEX TABLE battle_rounds;
  `
}
