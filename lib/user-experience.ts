// User Experience Features
// Onboarding Tutorial, Quick Rematch, Battle Scheduling, Warm-up Room, Clip Sharing

import { supabase, Profile, Battle } from './supabase'

// ===========================================
// ONBOARDING TUTORIAL
// ===========================================

export type TutorialStep =
  | 'welcome'
  | 'profile_setup'
  | 'audio_test'
  | 'beat_selection'
  | 'practice_verse'
  | 'scoring_explained'
  | 'first_battle'
  | 'complete'

export interface TutorialProgress {
  id: string
  user_id: string
  current_step: TutorialStep
  completed_steps: TutorialStep[]
  skipped: boolean
  practice_score: number | null
  started_at: string
  completed_at: string | null
}

export interface TutorialStepConfig {
  step: TutorialStep
  title: string
  description: string
  instructions: string[]
  hasInteraction: boolean
  canSkip: boolean
  estimatedTime: string
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    step: 'welcome',
    title: 'Welcome to Rap Battle Arena!',
    description: 'Get ready to show off your lyrical skills',
    instructions: [
      'This tutorial will walk you through everything you need to know',
      'You\'ll learn how battles work, how scoring works, and get some practice',
      'It only takes about 5 minutes to complete'
    ],
    hasInteraction: false,
    canSkip: true,
    estimatedTime: '30 seconds'
  },
  {
    step: 'profile_setup',
    title: 'Set Up Your Profile',
    description: 'Create your battle persona',
    instructions: [
      'Choose a unique username that represents you',
      'Upload an avatar or use our generator',
      'Write a short bio to introduce yourself'
    ],
    hasInteraction: true,
    canSkip: false,
    estimatedTime: '1 minute'
  },
  {
    step: 'audio_test',
    title: 'Test Your Microphone',
    description: 'Make sure your audio is crystal clear',
    instructions: [
      'Click the microphone button to start recording',
      'Say a few words to test your mic',
      'Adjust your input level if needed',
      'Make sure you\'re in a quiet environment'
    ],
    hasInteraction: true,
    canSkip: false,
    estimatedTime: '1 minute'
  },
  {
    step: 'beat_selection',
    title: 'Choose Your Beat',
    description: 'Every battle needs a beat to ride on',
    instructions: [
      'Browse our beat library',
      'Preview beats by clicking on them',
      'Different BPMs suit different styles',
      'You can also upload your own beats later'
    ],
    hasInteraction: true,
    canSkip: true,
    estimatedTime: '30 seconds'
  },
  {
    step: 'practice_verse',
    title: 'Drop Your First Verse',
    description: 'Time to practice! Record a 30-second freestyle',
    instructions: [
      'The beat will play automatically',
      'When the countdown ends, start rapping',
      'Don\'t worry about being perfect - this is practice!',
      'Try to stay on beat and rhyme where you can'
    ],
    hasInteraction: true,
    canSkip: false,
    estimatedTime: '1 minute'
  },
  {
    step: 'scoring_explained',
    title: 'Understanding Scores',
    description: 'Learn how our AI judges your verses',
    instructions: [
      'Rhyme Complexity (20%) - Multi-syllabic and internal rhymes score higher',
      'Flow & Rhythm (25%) - Stay on beat and vary your cadence',
      'Punchlines (20%) - End bars with impactful lines',
      'Delivery (15%) - Confidence and energy matter',
      'Creativity (10%) - Unique angles and metaphors',
      'Rebuttal (10%) - In battles, responding to your opponent scores points'
    ],
    hasInteraction: false,
    canSkip: true,
    estimatedTime: '1 minute'
  },
  {
    step: 'first_battle',
    title: 'Ready for Battle?',
    description: 'Time to face a real opponent',
    instructions: [
      'Click "Find Battle" to enter matchmaking',
      'You\'ll be matched with someone around your skill level',
      'Each battle has 3 rounds of 60 seconds each',
      'The AI judges after each round',
      'Good luck, and have fun!'
    ],
    hasInteraction: true,
    canSkip: true,
    estimatedTime: 'Varies'
  },
  {
    step: 'complete',
    title: 'Tutorial Complete!',
    description: 'You\'re ready to dominate the arena',
    instructions: [
      'You\'ve earned 100 Battle Coins as a reward!',
      'Check out Practice Mode to hone your skills',
      'Join a crew to battle alongside others',
      'Compete in tournaments for prizes'
    ],
    hasInteraction: false,
    canSkip: false,
    estimatedTime: '30 seconds'
  }
]

// Get user's tutorial progress
export async function getTutorialProgress(userId: string): Promise<TutorialProgress | null> {
  const { data, error } = await supabase
    .from('tutorial_progress')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return createTutorialProgress(userId)
    }
    return null
  }
  return data
}

// Create tutorial progress
async function createTutorialProgress(userId: string): Promise<TutorialProgress | null> {
  const { data, error } = await supabase
    .from('tutorial_progress')
    .insert({
      user_id: userId,
      current_step: 'welcome',
      completed_steps: [],
      skipped: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tutorial progress:', error)
    return null
  }
  return data
}

// Advance to next tutorial step
export async function advanceTutorialStep(
  userId: string,
  currentStep: TutorialStep,
  practiceScore?: number
): Promise<TutorialProgress | null> {
  const progress = await getTutorialProgress(userId)
  if (!progress) return null

  const stepIndex = TUTORIAL_STEPS.findIndex(s => s.step === currentStep)
  const nextStep = TUTORIAL_STEPS[stepIndex + 1]?.step || 'complete'

  const completedSteps = [...progress.completed_steps, currentStep]

  const { data, error } = await supabase
    .from('tutorial_progress')
    .update({
      current_step: nextStep,
      completed_steps: completedSteps,
      practice_score: practiceScore ?? progress.practice_score,
      completed_at: nextStep === 'complete' ? new Date().toISOString() : null
    })
    .eq('id', progress.id)
    .select()
    .single()

  if (error) {
    console.error('Error advancing tutorial:', error)
    return null
  }

  // Award coins on completion
  if (nextStep === 'complete') {
    await supabase.rpc('add_coins_to_wallet', {
      p_user_id: userId,
      p_amount: 100
    })
  }

  return data
}

// Skip tutorial
export async function skipTutorial(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tutorial_progress')
    .update({
      skipped: true,
      current_step: 'complete',
      completed_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error skipping tutorial:', error)
    return false
  }
  return true
}

// Reset tutorial (for testing or replay)
export async function resetTutorial(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tutorial_progress')
    .update({
      current_step: 'welcome',
      completed_steps: [],
      skipped: false,
      practice_score: null,
      completed_at: null
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error resetting tutorial:', error)
    return false
  }
  return true
}

// ===========================================
// QUICK REMATCH
// ===========================================

export interface RematchRequest {
  id: string
  battle_id: string
  requester_id: string
  opponent_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  new_battle_id: string | null
  created_at: string
  expires_at: string
}

// Request a rematch
export async function requestRematch(
  battleId: string,
  requesterId: string,
  opponentId: string
): Promise<RematchRequest | null> {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + 5) // 5 minute window

  const { data, error } = await supabase
    .from('rematch_requests')
    .insert({
      battle_id: battleId,
      requester_id: requesterId,
      opponent_id: opponentId,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error requesting rematch:', error)
    return null
  }

  // Notify opponent
  await supabase.from('notifications').insert({
    user_id: opponentId,
    type: 'rematch_request',
    title: 'Rematch Request',
    message: 'Your opponent wants a rematch!',
    data: { rematch_id: data.id, battle_id: battleId }
  })

  return data
}

// Accept rematch
export async function acceptRematch(rematchId: string, userId: string): Promise<string | null> {
  const { data: rematch, error: fetchError } = await supabase
    .from('rematch_requests')
    .select('*')
    .eq('id', rematchId)
    .eq('opponent_id', userId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !rematch) {
    console.error('Rematch not found or not pending')
    return null
  }

  // Check expiry
  if (new Date(rematch.expires_at) < new Date()) {
    await supabase
      .from('rematch_requests')
      .update({ status: 'expired' })
      .eq('id', rematchId)
    return null
  }

  // Create new battle
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { data: battle, error: battleError } = await supabase
    .from('battles')
    .insert({
      room_code: roomCode,
      player1_id: rematch.requester_id,
      player2_id: rematch.opponent_id,
      status: 'ready',
      is_rematch: true,
      original_battle_id: rematch.battle_id
    })
    .select()
    .single()

  if (battleError) {
    console.error('Error creating rematch battle:', battleError)
    return null
  }

  // Update rematch request
  await supabase
    .from('rematch_requests')
    .update({
      status: 'accepted',
      new_battle_id: battle.id
    })
    .eq('id', rematchId)

  return battle.id
}

// Decline rematch
export async function declineRematch(rematchId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('rematch_requests')
    .update({ status: 'declined' })
    .eq('id', rematchId)
    .eq('opponent_id', userId)

  if (error) {
    console.error('Error declining rematch:', error)
    return false
  }
  return true
}

// Get pending rematch for user
export async function getPendingRematch(userId: string): Promise<RematchRequest | null> {
  const { data, error } = await supabase
    .from('rematch_requests')
    .select('*')
    .eq('opponent_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

// ===========================================
// BATTLE SCHEDULING
// ===========================================

export interface ScheduledBattle {
  id: string
  creator_id: string
  opponent_id: string | null
  scheduled_for: string
  title: string | null
  description: string | null
  is_public: boolean
  max_spectators: number | null
  beat_id: string | null
  status: 'scheduled' | 'confirmed' | 'live' | 'completed' | 'cancelled'
  battle_id: string | null
  reminder_sent: boolean
  created_at: string
  // Joined
  creator?: Profile
  opponent?: Profile
}

// Create scheduled battle
export async function scheduleNewBattle(
  creatorId: string,
  scheduledFor: string,
  options: {
    opponentId?: string
    title?: string
    description?: string
    isPublic?: boolean
    maxSpectators?: number
    beatId?: string
  } = {}
): Promise<ScheduledBattle | null> {
  const { data, error } = await supabase
    .from('scheduled_battles')
    .insert({
      creator_id: creatorId,
      opponent_id: options.opponentId || null,
      scheduled_for: scheduledFor,
      title: options.title || null,
      description: options.description || null,
      is_public: options.isPublic ?? true,
      max_spectators: options.maxSpectators || null,
      beat_id: options.beatId || null,
      status: options.opponentId ? 'confirmed' : 'scheduled'
    })
    .select()
    .single()

  if (error) {
    console.error('Error scheduling battle:', error)
    return null
  }

  // Notify opponent if specified
  if (options.opponentId) {
    await supabase.from('notifications').insert({
      user_id: options.opponentId,
      type: 'battle_scheduled',
      title: 'Battle Scheduled',
      message: `You have a battle scheduled for ${new Date(scheduledFor).toLocaleString()}`,
      data: { scheduled_battle_id: data.id }
    })
  }

  return data
}

// Get upcoming scheduled battles for user
export async function getUpcomingScheduledBattles(userId: string): Promise<ScheduledBattle[]> {
  const { data, error } = await supabase
    .from('scheduled_battles')
    .select(`
      *,
      creator:profiles!scheduled_battles_creator_id_fkey(id, username, avatar_url),
      opponent:profiles!scheduled_battles_opponent_id_fkey(id, username, avatar_url)
    `)
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .in('status', ['scheduled', 'confirmed'])
    .gt('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })

  if (error) {
    console.error('Error fetching scheduled battles:', error)
    return []
  }
  return data || []
}

// Get public scheduled battles
export async function getPublicScheduledBattles(limit: number = 20): Promise<ScheduledBattle[]> {
  const { data, error } = await supabase
    .from('scheduled_battles')
    .select(`
      *,
      creator:profiles!scheduled_battles_creator_id_fkey(id, username, avatar_url, elo_rating),
      opponent:profiles!scheduled_battles_opponent_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('is_public', true)
    .in('status', ['scheduled', 'confirmed'])
    .gt('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching public battles:', error)
    return []
  }
  return data || []
}

// Join a public scheduled battle as opponent
export async function joinScheduledBattle(battleId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scheduled_battles')
    .update({
      opponent_id: userId,
      status: 'confirmed'
    })
    .eq('id', battleId)
    .is('opponent_id', null)
    .eq('is_public', true)

  if (error) {
    console.error('Error joining scheduled battle:', error)
    return false
  }
  return true
}

// Cancel scheduled battle
export async function cancelScheduledBattle(battleId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scheduled_battles')
    .update({ status: 'cancelled' })
    .eq('id', battleId)
    .eq('creator_id', userId)
    .in('status', ['scheduled', 'confirmed'])

  if (error) {
    console.error('Error cancelling scheduled battle:', error)
    return false
  }
  return true
}

// ===========================================
// WARM-UP ROOM
// ===========================================

export interface WarmUpSession {
  id: string
  user_id: string
  battle_id: string
  beat_id: string | null
  duration_seconds: number
  status: 'active' | 'completed'
  recordings: WarmUpRecording[]
  started_at: string
  ended_at: string | null
}

export interface WarmUpRecording {
  id: string
  session_id: string
  audio_url: string | null
  transcript: string | null
  duration_seconds: number
  score: number | null
  created_at: string
}

// Start warm-up session
export async function startWarmUpSession(
  userId: string,
  battleId: string,
  beatId?: string
): Promise<WarmUpSession | null> {
  const { data, error } = await supabase
    .from('warmup_sessions')
    .insert({
      user_id: userId,
      battle_id: battleId,
      beat_id: beatId || null,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Error starting warm-up:', error)
    return null
  }
  return { ...data, recordings: [] }
}

// Save warm-up recording
export async function saveWarmUpRecording(
  sessionId: string,
  audioUrl: string,
  durationSeconds: number,
  transcript?: string,
  score?: number
): Promise<WarmUpRecording | null> {
  const { data, error } = await supabase
    .from('warmup_recordings')
    .insert({
      session_id: sessionId,
      audio_url: audioUrl,
      transcript: transcript || null,
      duration_seconds: durationSeconds,
      score: score || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving warm-up recording:', error)
    return null
  }
  return data
}

// End warm-up session
export async function endWarmUpSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('warmup_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString()
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Error ending warm-up:', error)
    return false
  }
  return true
}

// Get warm-up session for battle
export async function getWarmUpSession(
  userId: string,
  battleId: string
): Promise<WarmUpSession | null> {
  const { data, error } = await supabase
    .from('warmup_sessions')
    .select(`
      *,
      recordings:warmup_recordings(*)
    `)
    .eq('user_id', userId)
    .eq('battle_id', battleId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

// ===========================================
// CLIP SHARING
// ===========================================

export interface SharedClip {
  id: string
  user_id: string
  battle_id: string
  round_number: number | null
  start_time: number // seconds
  end_time: number
  title: string
  caption: string | null
  video_url: string | null
  thumbnail_url: string | null
  watermark_enabled: boolean
  platforms_shared: string[]
  views: number
  shares: number
  created_at: string
  // Joined
  user?: Profile
}

export interface ClipGenerationOptions {
  includeScoreOverlay: boolean
  includeBranding: boolean
  includeUsername: boolean
  aspectRatio: '16:9' | '9:16' | '1:1'
  quality: 'standard' | 'high'
}

// Create clip from battle moment
export async function createClip(
  userId: string,
  battleId: string,
  startTime: number,
  endTime: number,
  title: string,
  options: {
    roundNumber?: number
    caption?: string
    watermarkEnabled?: boolean
  } = {}
): Promise<SharedClip | null> {
  const { data, error } = await supabase
    .from('shared_clips')
    .insert({
      user_id: userId,
      battle_id: battleId,
      round_number: options.roundNumber || null,
      start_time: startTime,
      end_time: endTime,
      title,
      caption: options.caption || null,
      watermark_enabled: options.watermarkEnabled ?? true,
      platforms_shared: []
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating clip:', error)
    return null
  }

  // Queue video generation job
  await supabase.from('background_jobs').insert({
    type: 'generate_clip',
    payload: {
      clip_id: data.id,
      battle_id: battleId,
      start_time: startTime,
      end_time: endTime
    },
    priority: 'normal',
    status: 'pending'
  })

  return data
}

// Get user's clips
export async function getUserClips(userId: string): Promise<SharedClip[]> {
  const { data, error } = await supabase
    .from('shared_clips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clips:', error)
    return []
  }
  return data || []
}

// Get clip share URL
export function getClipShareUrl(clipId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rapbattlearena.com'
  return `${baseUrl}/clips/${clipId}`
}

// Generate platform-specific share URLs
export function generateShareUrls(clip: SharedClip): Record<string, string> {
  const clipUrl = getClipShareUrl(clip.id)
  const text = encodeURIComponent(clip.title + (clip.caption ? ` - ${clip.caption}` : ''))

  return {
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(clipUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(clipUrl)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(clipUrl)}&title=${text}`,
    whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(clipUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(clipUrl)}&text=${text}`,
    copy: clipUrl
  }
}

// Record clip share
export async function recordClipShare(clipId: string, platform: string): Promise<void> {
  const { data: clip } = await supabase
    .from('shared_clips')
    .select('platforms_shared, shares')
    .eq('id', clipId)
    .single()

  if (clip) {
    const platforms = clip.platforms_shared || []
    if (!platforms.includes(platform)) {
      platforms.push(platform)
    }

    await supabase
      .from('shared_clips')
      .update({
        platforms_shared: platforms,
        shares: (clip.shares || 0) + 1
      })
      .eq('id', clipId)
  }
}

// Increment clip views
export async function incrementClipViews(clipId: string): Promise<void> {
  await supabase.rpc('increment_clip_views', { p_clip_id: clipId })
}

// Get trending clips
export async function getTrendingClips(limit: number = 20): Promise<SharedClip[]> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('shared_clips')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .gte('created_at', weekAgo.toISOString())
    .not('video_url', 'is', null)
    .order('views', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching trending clips:', error)
    return []
  }
  return data || []
}

// Delete clip
export async function deleteClip(clipId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('shared_clips')
    .delete()
    .eq('id', clipId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting clip:', error)
    return false
  }
  return true
}

// Batch download clips for mixtape
export async function getClipsForDownload(clipIds: string[]): Promise<{ id: string; url: string }[]> {
  const { data, error } = await supabase
    .from('shared_clips')
    .select('id, video_url')
    .in('id', clipIds)
    .not('video_url', 'is', null)

  if (error) {
    console.error('Error fetching clips for download:', error)
    return []
  }

  return (data || []).map(clip => ({
    id: clip.id,
    url: clip.video_url!
  }))
}
