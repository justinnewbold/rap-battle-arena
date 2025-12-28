import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

/**
 * Simple rate limiter using in-memory store
 * Note: In production, use Redis or similar for distributed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier

  const existing = rateLimitStore.get(key)

  if (!existing || now > existing.resetAt) {
    // Create new window
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

// Clean up old rate limit entries periodically
// Note: In serverless environments, this cleanup may not run between cold starts.
// For production with high traffic, consider using Redis for distributed rate limiting.
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
  }, 60000) // Clean up every minute

  // Prevent interval from keeping the process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }
}

// Start cleanup in non-edge runtime environments
if (typeof setInterval !== 'undefined') {
  startRateLimitCleanup()
}
