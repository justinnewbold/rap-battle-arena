import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import {
  authenticateRequest,
  checkRateLimit,
  rateLimitedResponse,
  serverErrorResponse,
  validateLiveKitCredentials
} from '@/lib/api-auth'
import { API_RATE_LIMITS } from '@/lib/constants'
import { validateRequest, livekitTokenRequestSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      `livekit:${auth.userId}`,
      API_RATE_LIMITS.livekit.maxRequests,
      API_RATE_LIMITS.livekit.windowMs
    )
    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.resetAt)
    }

    // Validate LiveKit credentials
    let credentials: { apiKey: string; apiSecret: string }
    try {
      credentials = validateLiveKitCredentials()
    } catch {
      return serverErrorResponse('LiveKit credentials not configured')
    }

    // Validate input with Zod
    const validation = await validateRequest(request, livekitTokenRequestSchema)
    if (validation.error) {
      return validation.error
    }

    const { roomName, participantName, participantId } = validation.data

    // Create access token (input already validated by Zod schema)
    const at = new AccessToken(credentials.apiKey, credentials.apiSecret, {
      identity: participantId || auth.userId, // Use authenticated user ID if not provided
      name: participantName,
      // Token valid for 24 hours
      ttl: 60 * 60 * 24,
    })

    // Grant permissions
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await at.toJwt()

    return NextResponse.json({ token }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt)
      }
    })
  } catch (error: unknown) {
    console.error('Error generating LiveKit token:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate token'
    return serverErrorResponse(message)
  }
}
