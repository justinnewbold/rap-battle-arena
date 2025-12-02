import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
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
    })

  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}
