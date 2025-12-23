/**
 * Client-side rate limiter using sliding window algorithm
 * Prevents spam and abuse of API calls from the client
 */

interface RateLimitEntry {
  timestamps: number[]
  blocked: boolean
  blockedUntil: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  blockDurationMs?: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private defaultConfig: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    blockDurationMs: 30000, // 30 seconds block after exceeding limit
  }

  /**
   * Check if an action is allowed under the rate limit
   * @param key Unique identifier for the rate limit (e.g., 'vote', 'chat', 'api:judge')
   * @param config Optional custom configuration for this specific limit
   * @returns Object with allowed status and remaining requests
   */
  check(key: string, config?: Partial<RateLimitConfig>): { allowed: boolean; remaining: number; retryAfter?: number } {
    const { maxRequests, windowMs, blockDurationMs } = { ...this.defaultConfig, ...config }
    const now = Date.now()

    let entry = this.limits.get(key)

    if (!entry) {
      entry = { timestamps: [], blocked: false, blockedUntil: 0 }
      this.limits.set(key, entry)
    }

    // Check if currently blocked
    if (entry.blocked && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      }
    }

    // Unblock if block period has passed
    if (entry.blocked && now >= entry.blockedUntil) {
      entry.blocked = false
      entry.blockedUntil = 0
      entry.timestamps = []
    }

    // Remove old timestamps outside the window
    entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs)

    const remaining = maxRequests - entry.timestamps.length

    if (remaining <= 0) {
      // Block the user
      entry.blocked = true
      entry.blockedUntil = now + (blockDurationMs || 30000)

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((blockDurationMs || 30000) / 1000),
      }
    }

    return {
      allowed: true,
      remaining,
    }
  }

  /**
   * Record a request/action
   * @param key Unique identifier for the rate limit
   * @param config Optional custom configuration
   * @returns Same as check() but records the action first
   */
  record(key: string, config?: Partial<RateLimitConfig>): { allowed: boolean; remaining: number; retryAfter?: number } {
    const result = this.check(key, config)

    if (result.allowed) {
      const entry = this.limits.get(key)!
      entry.timestamps.push(Date.now())
    }

    return result
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.limits.delete(key)
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.limits.clear()
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Pre-configured rate limiters for common actions
export const voteRateLimiter = {
  check: () => rateLimiter.check('vote', { maxRequests: 5, windowMs: 10000, blockDurationMs: 5000 }),
  record: () => rateLimiter.record('vote', { maxRequests: 5, windowMs: 10000, blockDurationMs: 5000 }),
}

export const chatRateLimiter = {
  check: () => rateLimiter.check('chat', { maxRequests: 10, windowMs: 10000, blockDurationMs: 10000 }),
  record: () => rateLimiter.record('chat', { maxRequests: 10, windowMs: 10000, blockDurationMs: 10000 }),
}

export const apiRateLimiter = {
  judge: {
    check: () => rateLimiter.check('api:judge', { maxRequests: 5, windowMs: 60000, blockDurationMs: 60000 }),
    record: () => rateLimiter.record('api:judge', { maxRequests: 5, windowMs: 60000, blockDurationMs: 60000 }),
  },
  transcribe: {
    check: () => rateLimiter.check('api:transcribe', { maxRequests: 10, windowMs: 60000, blockDurationMs: 30000 }),
    record: () => rateLimiter.record('api:transcribe', { maxRequests: 10, windowMs: 60000, blockDurationMs: 30000 }),
  },
}

// Hook for use in React components
import { useCallback, useState } from 'react'

export function useRateLimiter(key: string, config?: Partial<RateLimitConfig>) {
  const [isBlocked, setIsBlocked] = useState(false)
  const [retryAfter, setRetryAfter] = useState<number | undefined>()

  const checkAndRecord = useCallback(() => {
    const result = rateLimiter.record(key, config)
    setIsBlocked(!result.allowed)
    setRetryAfter(result.retryAfter)
    return result
  }, [key, config])

  const check = useCallback(() => {
    const result = rateLimiter.check(key, config)
    setIsBlocked(!result.allowed)
    setRetryAfter(result.retryAfter)
    return result
  }, [key, config])

  return {
    isBlocked,
    retryAfter,
    check,
    checkAndRecord,
    reset: () => rateLimiter.reset(key),
  }
}
