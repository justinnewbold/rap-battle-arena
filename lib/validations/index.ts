import { z } from 'zod'
import { NextResponse } from 'next/server'
import { INPUT_LIMITS } from '@/lib/constants'

/**
 * Parse and validate request body with Zod schema
 * Returns validated data or null with error response
 */
export async function validateRequest<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return {
        error: NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        )
      }
    }

    return { data: result.data }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
  }
}

/**
 * Validate FormData with Zod schema
 */
export async function validateFormData<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const formData = await request.formData()
    const obj: Record<string, unknown> = {}

    formData.forEach((value, key) => {
      obj[key] = value
    })

    const result = schema.safeParse(obj)

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return {
        error: NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        )
      }
    }

    return { data: result.data }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      )
    }
  }
}

// ========================================
// Judge API Schemas
// ========================================

export const judgeRequestSchema = z.object({
  transcript: z
    .string()
    .min(1, 'Transcript is required')
    .max(INPUT_LIMITS.transcriptMaxLength, `Transcript must be under ${INPUT_LIMITS.transcriptMaxLength} characters`),
  opponentTranscript: z
    .string()
    .max(INPUT_LIMITS.transcriptMaxLength, `Opponent transcript must be under ${INPUT_LIMITS.transcriptMaxLength} characters`)
    .optional()
    .nullable(),
  roundNumber: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(1),
})

export type JudgeRequest = z.infer<typeof judgeRequestSchema>

export const judgeResponseSchema = z.object({
  rhyme: z.number().min(0).max(10),
  flow: z.number().min(0).max(10),
  punchlines: z.number().min(0).max(10),
  delivery: z.number().min(0).max(10),
  creativity: z.number().min(0).max(10),
  rebuttal: z.number().min(0).max(10),
  feedback: z.string(),
  total: z.number(),
  model: z.string(),
})

export type JudgeResponse = z.infer<typeof judgeResponseSchema>

// ========================================
// LiveKit Token API Schemas
// ========================================

export const livekitTokenRequestSchema = z.object({
  roomName: z
    .string()
    .min(1, 'Room name is required')
    .max(128, 'Room name too long')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Room name can only contain letters, numbers, hyphens, and underscores'),
  participantName: z
    .string()
    .min(1, 'Participant name is required')
    .max(64, 'Participant name too long'),
  participantId: z
    .string()
    .uuid('Invalid participant ID format')
    .optional(),
})

export type LiveKitTokenRequest = z.infer<typeof livekitTokenRequestSchema>

// ========================================
// Transcription API Schemas
// ========================================

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const VALID_AUDIO_TYPES = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg']

export const transcribeRequestSchema = z.object({
  audio: z
    .instanceof(File, { message: 'Audio file is required' })
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    )
    .refine(
      (file) => VALID_AUDIO_TYPES.some(type => file.type.startsWith(type.split('/')[0])),
      'Invalid audio file type. Supported: webm, mp3, wav, mp4, ogg'
    ),
})

export type TranscribeRequest = z.infer<typeof transcribeRequestSchema>

// ========================================
// Battle Schemas
// ========================================

export const createBattleSchema = z.object({
  opponentId: z.string().uuid('Invalid opponent ID'),
  beatId: z.string().uuid('Invalid beat ID').optional().nullable(),
  rounds: z.number().int().min(1).max(5).default(3),
  turnDuration: z.number().int().min(30).max(120).default(60),
})

export type CreateBattleInput = z.infer<typeof createBattleSchema>

export const submitVoteSchema = z.object({
  battleId: z.string().uuid('Invalid battle ID'),
  roundNumber: z.number().int().min(1).max(10),
  votedForId: z.string().uuid('Invalid user ID'),
})

export type SubmitVoteInput = z.infer<typeof submitVoteSchema>

export const chatMessageSchema = z.object({
  battleId: z.string().uuid('Invalid battle ID'),
  message: z.string().min(1).max(500, 'Message too long (max 500 characters)'),
})

export type ChatMessageInput = z.infer<typeof chatMessageSchema>

// ========================================
// Profile Schemas
// ========================================

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be under 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must be under 500 characters')
    .optional()
    .nullable(),
  avatar_url: z
    .string()
    .url('Invalid avatar URL')
    .optional()
    .nullable(),
  location: z
    .string()
    .max(100, 'Location must be under 100 characters')
    .optional()
    .nullable(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// ========================================
// Crew Schemas
// ========================================

export const createCrewSchema = z.object({
  name: z
    .string()
    .min(3, 'Crew name must be at least 3 characters')
    .max(50, 'Crew name must be under 50 characters'),
  tag: z
    .string()
    .min(2, 'Tag must be at least 2 characters')
    .max(6, 'Tag must be under 6 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Tag can only contain letters and numbers'),
  description: z
    .string()
    .max(500, 'Description must be under 500 characters')
    .optional()
    .nullable(),
})

export type CreateCrewInput = z.infer<typeof createCrewSchema>

// ========================================
// Tournament Schemas
// ========================================

export const createTournamentSchema = z.object({
  name: z
    .string()
    .min(3, 'Tournament name must be at least 3 characters')
    .max(100, 'Tournament name must be under 100 characters'),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional()
    .nullable(),
  maxParticipants: z
    .number()
    .int()
    .refine(val => [4, 8, 16, 32, 64].includes(val), 'Max participants must be 4, 8, 16, 32, or 64'),
  entryFee: z
    .number()
    .int()
    .min(0)
    .max(10000)
    .default(0),
  prizePool: z
    .number()
    .int()
    .min(0)
    .default(0),
  startTime: z
    .string()
    .datetime('Invalid start time format')
    .refine(
      (date) => new Date(date) > new Date(),
      'Start time must be in the future'
    ),
})

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>

// ========================================
// Search Schemas
// ========================================

export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query too long')
    .transform(val => val.replace(/[%_\\'"(),]/g, '')), // Sanitize for SQL
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0),
})

export type SearchQueryInput = z.infer<typeof searchQuerySchema>

// ========================================
// Settings Schemas
// ========================================

export const userSettingsSchema = z.object({
  sound_enabled: z.boolean().optional(),
  sound_volume: z.number().min(0).max(1).optional(),
  notifications_enabled: z.boolean().optional(),
  notifications_friend_requests: z.boolean().optional(),
  notifications_battle_invites: z.boolean().optional(),
  notifications_tournament_updates: z.boolean().optional(),
  privacy_show_online_status: z.boolean().optional(),
  privacy_allow_friend_requests: z.boolean().optional(),
  privacy_show_battle_history: z.boolean().optional(),
})

export type UserSettingsInput = z.infer<typeof userSettingsSchema>

// ========================================
// Beat Upload Schemas
// ========================================

export const uploadBeatSchema = z.object({
  name: z
    .string()
    .min(1, 'Beat name is required')
    .max(100, 'Beat name must be under 100 characters'),
  artist: z
    .string()
    .min(1, 'Artist name is required')
    .max(100, 'Artist name must be under 100 characters'),
  bpm: z
    .number()
    .int()
    .min(60, 'BPM must be at least 60')
    .max(200, 'BPM must be under 200'),
  duration: z
    .number()
    .min(30, 'Duration must be at least 30 seconds')
    .max(300, 'Duration must be under 5 minutes'),
  isPublic: z.boolean().default(false),
})

export type UploadBeatInput = z.infer<typeof uploadBeatSchema>

// ========================================
// Common ID Schemas
// ========================================

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
