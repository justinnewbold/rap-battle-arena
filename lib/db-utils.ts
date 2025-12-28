/**
 * Database query optimization utilities
 * Includes caching, pagination, and query helpers
 */

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

// Clean expired entries periodically
setInterval(() => {
  const now = Date.now()
  cache.forEach((entry, key) => {
    if (entry.expiresAt < now) {
      cache.delete(key)
    }
  })
}, 30000) // Clean every 30 seconds

/**
 * Cache wrapper for database queries
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 60000 // Default 1 minute
): Promise<T> {
  const existing = cache.get(key) as CacheEntry<T> | undefined

  if (existing && existing.expiresAt > Date.now()) {
    return existing.data
  }

  const data = await fetcher()

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })

  return data
}

/**
 * Invalidate cache entries by key or pattern
 */
export function invalidateCache(keyOrPattern: string | RegExp): void {
  if (typeof keyOrPattern === 'string') {
    cache.delete(keyOrPattern)
  } else {
    Array.from(cache.keys()).forEach(key => {
      if (keyOrPattern.test(key)) {
        cache.delete(key)
      }
    })
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cache.clear()
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    nextCursor?: string
    prevCursor?: string
  }
}

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit
}

/**
 * Create paginated result from data and total count
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Create cursor-based pagination result
 */
export function createCursorPaginatedResult<T extends { id: string }>(
  data: T[],
  limit: number,
  hasMore: boolean
): PaginatedResult<T> {
  // Safely access array elements with bounds checking
  const lastItem = data.length > 0 ? data[data.length - 1] : undefined
  const firstItem = data.length > 0 ? data[0] : undefined

  return {
    data,
    pagination: {
      page: 1, // Not applicable for cursor pagination
      limit,
      total: -1, // Unknown in cursor pagination
      totalPages: -1,
      hasNext: hasMore,
      hasPrev: false,
      nextCursor: hasMore && lastItem ? lastItem.id : undefined,
      prevCursor: firstItem ? firstItem.id : undefined,
    },
  }
}

/**
 * Parse and validate pagination params from request
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number } = {}
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '') || defaults.page || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '') || defaults.limit || 20))
  const cursor = searchParams.get('cursor') || undefined

  return { page, limit, cursor }
}

// Query optimization helpers
export interface QueryOptions {
  select?: string[]
  orderBy?: { column: string; ascending?: boolean }[]
  filters?: Record<string, unknown>
}

/**
 * Escape a value for safe SQL insertion
 * Prevents SQL injection by escaping special characters
 */
function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }
  // Escape single quotes by doubling them
  const str = String(value)
  return `'${str.replace(/'/g, "''")}'`
}

/**
 * Validate column/table name to prevent injection
 * Only allows alphanumeric characters and underscores
 */
function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

/**
 * Build optimized select query
 * Only selects needed columns to reduce data transfer
 * Note: Uses parameterized-style escaping to prevent SQL injection
 */
export function buildSelectQuery(
  table: string,
  options: QueryOptions = {}
): string {
  // Validate table name
  if (!isValidIdentifier(table)) {
    throw new Error(`Invalid table name: ${table}`)
  }

  // Validate and build column list
  const columns = options.select?.map(col => {
    if (!isValidIdentifier(col)) {
      throw new Error(`Invalid column name: ${col}`)
    }
    return col
  }).join(', ') || '*'

  let query = `SELECT ${columns} FROM ${table}`

  // Add filters with proper escaping
  if (options.filters && Object.keys(options.filters).length > 0) {
    const conditions = Object.entries(options.filters)
      .map(([key, value]) => {
        if (!isValidIdentifier(key)) {
          throw new Error(`Invalid column name: ${key}`)
        }
        if (value === null) return `${key} IS NULL`
        if (Array.isArray(value)) {
          const escapedValues = value.map(v => escapeValue(v)).join(', ')
          return `${key} IN (${escapedValues})`
        }
        return `${key} = ${escapeValue(value)}`
      })
      .join(' AND ')
    query += ` WHERE ${conditions}`
  }

  // Add ordering with validation
  if (options.orderBy && options.orderBy.length > 0) {
    const orderClauses = options.orderBy
      .map(o => {
        if (!isValidIdentifier(o.column)) {
          throw new Error(`Invalid column name: ${o.column}`)
        }
        return `${o.column} ${o.ascending ? 'ASC' : 'DESC'}`
      })
      .join(', ')
    query += ` ORDER BY ${orderClauses}`
  }

  return query
}

/**
 * Suggested indexes for common queries
 * Run these in your database migration
 */
export const SUGGESTED_INDEXES = `
-- User queries
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_elo ON profiles(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);

-- Battle queries
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_battles_player1 ON battles(player1_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2 ON battles(player2_id);
CREATE INDEX IF NOT EXISTS idx_battles_winner ON battles(winner_id);
CREATE INDEX IF NOT EXISTS idx_battles_created ON battles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battles_room_code ON battles(room_code);

-- Composite index for battle history queries
CREATE INDEX IF NOT EXISTS idx_battles_player_history
  ON battles(player1_id, created_at DESC)
  INCLUDE (player2_id, winner_id, status);

-- Tournament queries
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start ON tournaments(start_time);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);

-- Notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- Friendship queries
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
`

/**
 * Batch queries for efficiency
 */
export async function batchQueries<T>(
  queries: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> {
  const results: T[] = []

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(q => q()))
    results.push(...batchResults)
  }

  return results
}

/**
 * Debounce database writes to prevent hammering
 */
const pendingWrites = new Map<string, NodeJS.Timeout>()

export function debouncedWrite<T>(
  key: string,
  writeFn: () => Promise<T>,
  delayMs: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Clear existing timeout if any
    const existing = pendingWrites.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      pendingWrites.delete(key)
      try {
        const result = await writeFn()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }, delayMs)

    pendingWrites.set(key, timeout)
  })
}
