import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

// Environment validation
function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Create Supabase client for server-side auth
function createServerSupabase() {
  const url = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  const key = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, key)
}

// Initialize Redis client (optional - falls back to in-memory if not configured)
let redis: Redis | null = null
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (REDIS_URL && REDIS_TOKEN) {
  try {
    redis = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    })
  } catch (error) {
    console.warn('Failed to initialize Redis, falling back to in-memory rate limiting:', error)
  }
}

export interface AuthResult {
  success: true
  userId: string
  user: {
    id: string
    email?: string
  }
}

export interface AuthError {
  success: false
  error: string
  status: number
}

export type AuthResponse = AuthResult | AuthError

/**
 * Authenticate a request using the Authorization header
 * Expects: Authorization: Bearer <supabase_access_token>
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResponse> {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid Authorization header',
        status: 401
      }
    }

    const token = authHeader.substring(7) // Remove 'Bearer '

    if (!token) {
      return {
        success: false,
        error: 'No token provided',
        status: 401
      }
    }

    const supabase = createServerSupabase()

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        success: false,
        error: 'Invalid or expired token',
        status: 401
      }
    }

    return {
      success: true,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email
      }
    }
  } catch (error) {
    console.error('Auth error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      status: 500
    }
  }
}

// In-memory fallback store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Check rate limit using Redis (distributed) or in-memory (fallback)
 * Supports sliding window rate limiting
 */
export async function checkRateLimitAsync(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()
  const windowSeconds = Math.ceil(windowMs / 1000)

  // Try Redis first for distributed rate limiting
  if (redis) {
    try {
      const key = `ratelimit:${identifier}`

      // Use Redis MULTI for atomic operations
      const pipeline = redis.pipeline()
      pipeline.incr(key)
      pipeline.pttl(key)

      const results = await pipeline.exec()
      const count = results[0] as number
      const ttl = results[1] as number

      // Set expiry on first request
      if (count === 1 || ttl === -1) {
        await redis.expire(key, windowSeconds)
      }

      const resetAt = now + (ttl > 0 ? ttl : windowMs)
      const allowed = count <= maxRequests
      const remaining = Math.max(0, maxRequests - count)

      return { allowed, remaining, resetAt }
    } catch (error) {
      console.warn('Redis rate limit check failed, falling back to in-memory:', error)
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const key = identifier
  const existing = rateLimitStore.get(key)

  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt }
}

/**
 * Synchronous rate limit check (in-memory only, for backwards compatibility)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier

  const existing = rateLimitStore.get(key)

  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt }
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Create a rate limited response
 */
export function rateLimitedResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(resetAt)
      }
    }
  )
}

/**
 * Create a bad request response
 */
export function badRequestResponse(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

/**
 * Create a server error response
 */
export function serverErrorResponse(message: string = 'Internal server error'): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 })
}

/**
 * Validate OpenAI API key exists
 */
export function validateOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return key
}

/**
 * Validate LiveKit credentials exist
 */
export function validateLiveKitCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured')
  }

  return { apiKey, apiSecret }
}

// Clean up old in-memory rate limit entries periodically
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function startRateLimitCleanup() {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    rateLimitStore.forEach((value, key) => {
      if (now > value.resetAt) {
        rateLimitStore.delete(key)
      }
    })
  }, 60000)

  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }
}

if (typeof setInterval !== 'undefined') {
  startRateLimitCleanup()
}
