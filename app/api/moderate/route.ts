import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRequest,
  checkRateLimit,
  rateLimitedResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api-auth'
import { API_RATE_LIMITS } from '@/lib/constants'
import {
  moderateText,
  checkSpam,
  moderateBattleRapContent,
} from '@/lib/moderation'

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      `moderate:${auth.userId}`,
      API_RATE_LIMITS.judge.maxRequests * 2, // Allow more moderation calls
      API_RATE_LIMITS.judge.windowMs
    )
    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.resetAt)
    }

    const body = await request.json()
    const { text, type = 'general' } = body

    if (!text || typeof text !== 'string') {
      return badRequestResponse('Text is required')
    }

    if (text.length > 5000) {
      return badRequestResponse('Text too long (max 5000 characters)')
    }

    // Check for spam first
    const spamCheck = checkSpam(text)
    if (spamCheck.isSpam) {
      return NextResponse.json({
        allowed: false,
        action: 'block',
        reason: spamCheck.reason,
        category: 'spam',
      })
    }

    // For battle rap content, use lenient moderation
    if (type === 'battle') {
      const battleResult = moderateBattleRapContent(text)
      return NextResponse.json({
        allowed: battleResult.allowed,
        action: battleResult.allowed ? 'allow' : 'block',
        warnings: battleResult.warnings,
        blockedReasons: battleResult.blockedReasons,
        category: 'battle',
      })
    }

    // For chat and other content, use OpenAI moderation
    const moderationResult = await moderateText(text)

    return NextResponse.json({
      allowed: moderationResult.action !== 'block',
      action: moderationResult.action,
      reason: moderationResult.reason,
      flagged: moderationResult.flagged,
      categories: moderationResult.categories,
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
    })
  } catch (error) {
    console.error('Moderation API error:', error)
    const message = error instanceof Error ? error.message : 'Failed to moderate content'
    return serverErrorResponse(message)
  }
}
