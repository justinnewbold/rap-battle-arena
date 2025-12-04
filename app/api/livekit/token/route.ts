import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

// Environment variables for LiveKit
// LIVEKIT_API_KEY and LIVEKIT_API_SECRET should be set in your environment
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET

export async function POST(request: NextRequest) {
  try {
    const { roomName, participantName, participantId } = await request.json()

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing roomName or participantName' },
        { status: 400 }
      )
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      )
    }

    // Create access token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantId || participantName,
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

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error generating LiveKit token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
