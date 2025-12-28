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
import { validateRequest, judgeRequestSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      `judge:${auth.userId}`,
      API_RATE_LIMITS.judge.maxRequests,
      API_RATE_LIMITS.judge.windowMs
    )
    if (!rateLimit.allowed) {
      return rateLimitedResponse(rateLimit.resetAt)
    }

    // Validate OpenAI key
    let apiKey: string
    try {
      apiKey = validateOpenAIKey()
    } catch {
      return serverErrorResponse('AI service not configured')
    }

    const openai = new OpenAI({ apiKey })

    // Validate input with Zod
    const validation = await validateRequest(request, judgeRequestSchema)
    if (validation.error) {
      return validation.error
    }

    const { transcript, opponentTranscript, roundNumber } = validation.data

    const prompt = `You are an expert hip-hop battle rap judge. Analyze the following rap verse and score it.

${opponentTranscript ? `OPPONENT'S PREVIOUS VERSE (for rebuttal context):
"${opponentTranscript}"

` : ''}VERSE TO JUDGE:
"${transcript}"

ROUND: ${roundNumber || 1}

Score each category from 1-10 (can use decimals):

1. RHYME COMPLEXITY (20% weight): Multi-syllabic rhymes, internal rhymes, rhyme schemes
2. FLOW & RHYTHM (25% weight): How well they ride the beat, cadence, breath control
3. PUNCHLINES (20% weight): Clever wordplay, double meanings, impact lines
4. DELIVERY (15% weight): Confidence, energy, conviction
5. CREATIVITY (10% weight): Original concepts, unique angles, metaphors
6. REBUTTAL (10% weight): ${opponentTranscript ? 'How well they responded to opponent' : 'N/A for first verse - score based on opening impact'}

Respond in this exact JSON format:
{
  "rhyme": <score>,
  "flow": <score>,
  "punchlines": <score>,
  "delivery": <score>,
  "creativity": <score>,
  "rebuttal": <score>,
  "feedback": "<2-3 sentence feedback highlighting strengths and areas to improve>"
}

Be fair but critical. Great battle rappers score 7-8. Legendary verses score 9+. Average is 5-6.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert hip-hop battle judge. You provide fair, detailed scoring of rap verses. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    })

    // Safely extract and parse the response
    const choice = completion.choices?.[0]
    const content = choice?.message?.content

    if (!content) {
      return serverErrorResponse('AI returned empty response')
    }

    let result: Record<string, unknown>
    try {
      result = JSON.parse(content)
    } catch {
      console.error('Failed to parse AI response:', content)
      return serverErrorResponse('AI returned invalid JSON response')
    }

    // Validate required fields exist and are numbers
    const requiredFields = ['rhyme', 'flow', 'punchlines', 'delivery', 'creativity', 'rebuttal']
    for (const field of requiredFields) {
      if (typeof result[field] !== 'number') {
        result[field] = 5 // Default score if missing or invalid
      }
    }

    // Calculate weighted total (values are guaranteed to be numbers after validation)
    const rhyme = Number(result.rhyme) || 5
    const flow = Number(result.flow) || 5
    const punchlines = Number(result.punchlines) || 5
    const delivery = Number(result.delivery) || 5
    const creativity = Number(result.creativity) || 5
    const rebuttal = Number(result.rebuttal) || 5

    const total = (
      rhyme * 0.20 +
      flow * 0.25 +
      punchlines * 0.20 +
      delivery * 0.15 +
      creativity * 0.10 +
      rebuttal * 0.10
    )

    return NextResponse.json({
      ...result,
      total: Math.round(total * 100) / 100,
      model: 'gpt-4-turbo-preview'
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt)
      }
    })

  } catch (error: unknown) {
    console.error('Judge API error:', error)
    const message = error instanceof Error ? error.message : 'Failed to judge verse'
    return serverErrorResponse(message)
  }
}
