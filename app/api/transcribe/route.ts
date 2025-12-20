import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  authenticateRequest,
  checkRateLimit,
  rateLimitedResponse,
  badRequestResponse,
  serverErrorResponse,
  validateOpenAIKey
} from '@/lib/api-auth'
import { API_RATE_LIMITS } from '@/lib/constants'

// Max file size: 25MB (OpenAI limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      `transcribe:${auth.userId}`,
      API_RATE_LIMITS.transcribe.maxRequests,
      API_RATE_LIMITS.transcribe.windowMs
    )
    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.resetAt)
    }

    // Validate OpenAI key
    let apiKey: string
    try {
      apiKey = validateOpenAIKey()
    } catch {
      return serverErrorResponse('Transcription service not configured')
    }

    const openai = new OpenAI({ apiKey })

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return badRequestResponse('No audio file provided')
    }

    // Validate file type
    const validTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg']
    if (!validTypes.some(type => audioFile.type.startsWith(type.split('/')[0]))) {
      return badRequestResponse('Invalid audio file type. Supported: webm, mp3, wav, mp4, ogg')
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return badRequestResponse(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    // Convert to format OpenAI accepts
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      prompt: 'This is a hip-hop rap battle freestyle verse. Transcribe accurately including slang, wordplay, and any explicit language.',
    })

    return NextResponse.json({
      transcript: transcription.text,
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt)
      }
    })

  } catch (error: unknown) {
    console.error('Transcription error:', error)
    const message = error instanceof Error ? error.message : 'Failed to transcribe audio'
    return serverErrorResponse(message)
  }
}
