/**
 * Rate limiting utilities for API routes
 * Uses in-memory storage - for production, use Redis
 */

interface RateLimitConfig {
  maxRequests: number      // Maximum requests allowed
  windowMs: number         // Time window in milliseconds
  message?: string         // Custom error message
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production)
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (entry.resetTime < now) {
      store.delete(key)
    }
  })
}, 60000) // Clean every minute

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = store.get(identifier)

  // If no entry or expired, create new one
  if (!entry || entry.resetTime < now) {
    store.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  // Increment count
  entry.count++
  store.set(identifier, entry)

  // Check if over limit
  if (entry.count > config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    limited: false,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const rateLimiters = {
  // AI endpoints - expensive operations
  judge: { maxRequests: 10, windowMs: 60000 },      // 10 per minute
  transcribe: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  moderate: { maxRequests: 30, windowMs: 60000 },   // 30 per minute

  // General API - standard limits
  api: { maxRequests: 100, windowMs: 60000 },       // 100 per minute

  // Auth endpoints - stricter limits
  auth: { maxRequests: 10, windowMs: 300000 },      // 10 per 5 minutes

  // Search - moderate limits
  search: { maxRequests: 30, windowMs: 60000 },     // 30 per minute
}

/**
 * Get client identifier from request headers
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  // Use first available, fallback to 'anonymous'
  const ip = forwarded?.split(',')[0]?.trim() || realIp || cfIp || 'anonymous'

  return ip
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
  }
}

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  config: RateLimitConfig = rateLimiters.api
) {
  return async (request: Request): Promise<Response> => {
    const identifier = getClientIdentifier(request)
    const { limited, remaining, resetTime } = checkRateLimit(identifier, config)

    if (limited) {
      return new Response(
        JSON.stringify({
          error: config.message || 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(remaining, resetTime, config.maxRequests),
            'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          },
        }
      )
    }

    const response = await handler(request)

    // Add rate limit headers to successful responses
    const headers = new Headers(response.headers)
    const rateLimitHeaders = createRateLimitHeaders(remaining, resetTime, config.maxRequests)
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      headers.set(key, value)
    })

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

/**
 * Request throttling - delays requests to prevent burst traffic
 */
const throttleQueues = new Map<string, Promise<void>>()

export async function throttle(
  identifier: string,
  delayMs: number = 100
): Promise<void> {
  const existing = throttleQueues.get(identifier)

  const newPromise = (async () => {
    if (existing) {
      await existing
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
  })()

  throttleQueues.set(identifier, newPromise)
  await newPromise

  // Clean up after completion
  if (throttleQueues.get(identifier) === newPromise) {
    throttleQueues.delete(identifier)
  }
}
