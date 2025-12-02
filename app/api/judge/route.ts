import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { transcript, opponentTranscript, roundNumber } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })
    }

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

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    // Calculate weighted total
    const total = (
      (result.rhyme || 5) * 0.20 +
      (result.flow || 5) * 0.25 +
      (result.punchlines || 5) * 0.20 +
      (result.delivery || 5) * 0.15 +
      (result.creativity || 5) * 0.10 +
      (result.rebuttal || 5) * 0.10
    )

    return NextResponse.json({
      ...result,
      total: Math.round(total * 100) / 100,
      model: 'gpt-4-turbo-preview'
    })

  } catch (error: any) {
    console.error('Judge API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to judge verse' },
      { status: 500 }
    )
  }
}
