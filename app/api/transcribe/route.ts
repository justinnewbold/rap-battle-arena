import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  authenticateRequest,
  checkRateLimit,
  rateLimitedResponse,
  serverErrorResponse,
  validateOpenAIKey
} from '@/lib/api-auth'
import { API_RATE_LIMITS } from '@/lib/constants'
import { validateFormData, transcribeRequestSchema } from '@/lib/validations'

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

    // Validate input with Zod
    const validation = await validateFormData(request, transcribeRequestSchema)
    if (validation.error) {
      return validation.error
    }

    const { audio: audioFile } = validation.data

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
