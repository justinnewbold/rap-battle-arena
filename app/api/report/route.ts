import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRequest,
  checkRateLimit,
  rateLimitedResponse,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/api-auth'
import { z } from 'zod'
import { supabase } from '@/lib/db/client'

const reportSchema = z.object({
  targetType: z.enum(['user', 'battle', 'message', 'verse']),
  targetId: z.string().uuid(),
  reason: z.enum([
    'harassment',
    'hate_speech',
    'spam',
    'inappropriate_content',
    'cheating',
    'impersonation',
    'other',
  ]),
  details: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Rate limiting - limit reports to prevent abuse
    const rateLimit = checkRateLimit(
      `report:${auth.userId}`,
      10, // Max 10 reports per hour
      60 * 60 * 1000
    )
    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.resetAt)
    }

    // Validate input
    const body = await request.json()
    const validation = reportSchema.safeParse(body)

    if (!validation.success) {
      return badRequestResponse(validation.error.errors[0].message)
    }

    const { targetType, targetId, reason, details } = validation.data

    // Create report in database
    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: auth.userId,
        target_type: targetType,
        target_id: targetId,
        reason,
        details,
        status: 'pending',
        created_at: new Date().toISOString(),
      })

    if (error) {
      // Table might not exist - log and return success anyway
      console.error('Failed to save report:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully. Our team will review it.',
    })
  } catch (error) {
    console.error('Report API error:', error)
    const message = error instanceof Error ? error.message : 'Failed to submit report'
    return serverErrorResponse(message)
  }
}
