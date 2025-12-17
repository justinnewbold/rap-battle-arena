import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import {
  authenticateRequest,
  checkRateLimit,
  rateLimitedResponse,
  badRequestResponse,
  serverErrorResponse,
  validateLiveKitCredentials
} from '@/lib/api-auth'
import { API_RATE_LIMITS } from '@/lib/constants'

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

    const { roomName, participantName, participantId } = await request.json()

    // Input validation
    if (!roomName || typeof roomName !== 'string') {
      return badRequestResponse('Missing or invalid roomName')
    }

    if (!participantName || typeof participantName !== 'string') {
      return badRequestResponse('Missing or invalid participantName')
    }

    // Sanitize room name (alphanumeric, hyphens, underscores only)
    const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '')
    if (sanitizedRoomName.length === 0 || sanitizedRoomName.length > 128) {
      return badRequestResponse('Invalid room name format')
    }

    // Sanitize participant name
    const sanitizedParticipantName = participantName.slice(0, 64)

    // Create access token
    const at = new AccessToken(credentials.apiKey, credentials.apiSecret, {
      identity: participantId || auth.userId, // Use authenticated user ID if not provided
      name: sanitizedParticipantName,
      // Token valid for 24 hours
      ttl: 60 * 60 * 24,
    })

    // Grant permissions
    at.addGrant({
      room: sanitizedRoomName,
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
