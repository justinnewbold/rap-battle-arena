import { supabase, Profile, Battle } from './supabase'

// Battle Challenge Types
export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'completed'

export interface BattleChallenge {
  id: string
  challenger_id: string
  challenged_id: string
  status: ChallengeStatus
  message: string | null
  wager_amount: number
  battle_id: string | null
  expires_at: string
  created_at: string
  updated_at: string
  // Joined data
  challenger?: Profile
  challenged?: Profile
  battle?: Battle
}

// Send a battle challenge to a specific user
export async function sendChallenge(
  challengerId: string,
  challengedId: string,
  message?: string,
  wagerAmount: number = 0
): Promise<BattleChallenge | null> {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiry

  const { data, error } = await supabase
    .from('battle_challenges')
    .insert({
      challenger_id: challengerId,
      challenged_id: challengedId,
      message: message || null,
      wager_amount: wagerAmount,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    })
    .select(`
      *,
      challenger:profiles!battle_challenges_challenger_id_fkey(id, username, avatar_url, elo_rating),
      challenged:profiles!battle_challenges_challenged_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .single()

  if (error) {
    console.error('Error sending challenge:', error)
    return null
  }
  return data
}

// Accept a challenge
export async function acceptChallenge(challengeId: string, userId: string): Promise<BattleChallenge | null> {
  const { data, error } = await supabase
    .from('battle_challenges')
    .update({
      status: 'accepted',
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)
    .eq('challenged_id', userId)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) {
    console.error('Error accepting challenge:', error)
    return null
  }
  return data
}

// Decline a challenge
export async function declineChallenge(challengeId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('battle_challenges')
    .update({
      status: 'declined',
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)
    .eq('challenged_id', userId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error declining challenge:', error)
    return false
  }
  return true
}

// Get pending challenges for a user (received)
export async function getPendingChallenges(userId: string): Promise<BattleChallenge[]> {
  const { data, error } = await supabase
    .from('battle_challenges')
    .select(`
      *,
      challenger:profiles!battle_challenges_challenger_id_fkey(id, username, avatar_url, elo_rating),
      challenged:profiles!battle_challenges_challenged_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('challenged_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching challenges:', error)
    return []
  }
  return data || []
}

// Get sent challenges
export async function getSentChallenges(userId: string): Promise<BattleChallenge[]> {
  const { data, error } = await supabase
    .from('battle_challenges')
    .select(`
      *,
      challenger:profiles!battle_challenges_challenger_id_fkey(id, username, avatar_url, elo_rating),
      challenged:profiles!battle_challenges_challenged_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('challenger_id', userId)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sent challenges:', error)
    return []
  }
  return data || []
}

// Cancel a sent challenge
export async function cancelChallenge(challengeId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('battle_challenges')
    .delete()
    .eq('id', challengeId)
    .eq('challenger_id', userId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error canceling challenge:', error)
    return false
  }
  return true
}

// Link challenge to battle
export async function linkChallengeToBattle(challengeId: string, battleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('battle_challenges')
    .update({
      battle_id: battleId,
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId)

  if (error) {
    console.error('Error linking challenge to battle:', error)
    return false
  }
  return true
}

// Weekly Themes Types
export interface WeeklyTheme {
  id: string
  title: string
  description: string
  keywords: string[]
  bonus_multiplier: number // e.g., 1.5 for 50% bonus
  starts_at: string
  ends_at: string
  is_active: boolean
  created_at: string
}

// Get current active theme
export async function getCurrentTheme(): Promise<WeeklyTheme | null> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('weekly_themes')
    .select('*')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .eq('is_active', true)
    .single()

  if (error) {
    return null
  }
  return data
}

// Get upcoming themes
export async function getUpcomingThemes(limit: number = 5): Promise<WeeklyTheme[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('weekly_themes')
    .select('*')
    .gt('starts_at', now)
    .eq('is_active', true)
    .order('starts_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching upcoming themes:', error)
    return []
  }
  return data || []
}

// Get past themes
export async function getPastThemes(limit: number = 10): Promise<WeeklyTheme[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('weekly_themes')
    .select('*')
    .lt('ends_at', now)
    .order('ends_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching past themes:', error)
    return []
  }
  return data || []
}

// Check if verse matches theme keywords
export function checkThemeMatch(transcript: string, keywords: string[]): boolean {
  const lowerTranscript = transcript.toLowerCase()
  return keywords.some(keyword => lowerTranscript.includes(keyword.toLowerCase()))
}

// Calculate theme bonus score
export function calculateThemeBonus(
  baseScore: number,
  transcript: string,
  theme: WeeklyTheme | null
): { score: number; bonusApplied: boolean; bonusAmount: number } {
  if (!theme || !transcript) {
    return { score: baseScore, bonusApplied: false, bonusAmount: 0 }
  }

  const matchesTheme = checkThemeMatch(transcript, theme.keywords)
  if (matchesTheme) {
    const bonusAmount = baseScore * (theme.bonus_multiplier - 1)
    return {
      score: baseScore + bonusAmount,
      bonusApplied: true,
      bonusAmount
    }
  }

  return { score: baseScore, bonusApplied: false, bonusAmount: 0 }
}

// Highlight Reels Types
export interface Highlight {
  id: string
  battle_id: string
  user_id: string
  round_number: number
  title: string
  description: string | null
  start_time: number // seconds into the round
  end_time: number
  thumbnail_url: string | null
  video_url: string | null
  views: number
  likes: number
  is_featured: boolean
  created_at: string
  // Joined data
  battle?: Battle
  user?: Profile
}

// Create a highlight from a battle moment
export async function createHighlight(
  battleId: string,
  userId: string,
  roundNumber: number,
  title: string,
  startTime: number,
  endTime: number,
  description?: string
): Promise<Highlight | null> {
  const { data, error } = await supabase
    .from('highlights')
    .insert({
      battle_id: battleId,
      user_id: userId,
      round_number: roundNumber,
      title,
      description: description || null,
      start_time: startTime,
      end_time: endTime
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating highlight:', error)
    return null
  }
  return data
}

// Get user's highlights
export async function getUserHighlights(userId: string): Promise<Highlight[]> {
  const { data, error } = await supabase
    .from('highlights')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching highlights:', error)
    return []
  }
  return data || []
}

// Get featured highlights
export async function getFeaturedHighlights(limit: number = 10): Promise<Highlight[]> {
  const { data, error } = await supabase
    .from('highlights')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .eq('is_featured', true)
    .order('views', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching featured highlights:', error)
    return []
  }
  return data || []
}

// Get trending highlights
export async function getTrendingHighlights(limit: number = 20): Promise<Highlight[]> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('highlights')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .gte('created_at', weekAgo.toISOString())
    .order('views', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching trending highlights:', error)
    return []
  }
  return data || []
}

// Increment highlight views
export async function incrementHighlightViews(highlightId: string): Promise<void> {
  await supabase.rpc('increment_highlight_views', { highlight_id: highlightId })
}

// Like a highlight
export async function likeHighlight(highlightId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('highlight_likes')
    .insert({ highlight_id: highlightId, user_id: userId })

  if (error) {
    console.error('Error liking highlight:', error)
    return false
  }

  // Increment likes count
  await supabase.rpc('increment_highlight_likes', { highlight_id: highlightId })
  return true
}

// Unlike a highlight
export async function unlikeHighlight(highlightId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('highlight_likes')
    .delete()
    .eq('highlight_id', highlightId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error unliking highlight:', error)
    return false
  }

  await supabase.rpc('decrement_highlight_likes', { highlight_id: highlightId })
  return true
}

// Check if user liked a highlight
export async function hasUserLikedHighlight(highlightId: string, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('highlight_likes')
    .select('*', { count: 'exact', head: true })
    .eq('highlight_id', highlightId)
    .eq('user_id', userId)

  if (error) return false
  return (count || 0) > 0
}

// Trending Page Types
export interface TrendingBattle {
  battle: Battle
  spectatorCount: number
  voteCount: number
  highlightCount: number
  trendingScore: number
}

export interface RisingStar {
  user: Profile
  recentWins: number
  winStreak: number
  eloGain: number
  risingScore: number
}

// Get trending battles
export async function getTrendingBattles(limit: number = 10): Promise<TrendingBattle[]> {
  const dayAgo = new Date()
  dayAgo.setDate(dayAgo.getDate() - 1)

  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(id, username, avatar_url, elo_rating),
      player2:profiles!battles_player2_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('status', 'complete')
    .gte('completed_at', dayAgo.toISOString())
    .order('completed_at', { ascending: false })
    .limit(limit * 2) // Get more to filter

  if (error) {
    console.error('Error fetching trending battles:', error)
    return []
  }

  // Calculate trending scores (simplified - would use real metrics)
  const trending = (data || []).map(battle => ({
    battle,
    spectatorCount: Math.floor(Math.random() * 100), // Placeholder
    voteCount: Math.floor(Math.random() * 50),
    highlightCount: Math.floor(Math.random() * 10),
    trendingScore: Math.random() * 100
  }))

  return trending
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, limit)
}

// Get rising stars
export async function getRisingStars(limit: number = 10): Promise<RisingStar[]> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .gte('updated_at', weekAgo.toISOString())
    .order('elo_rating', { ascending: false })
    .limit(limit * 2)

  if (error) {
    console.error('Error fetching rising stars:', error)
    return []
  }

  // Calculate rising scores (simplified)
  const rising = (data || []).map(user => ({
    user,
    recentWins: Math.floor(Math.random() * 10),
    winStreak: Math.floor(Math.random() * 5),
    eloGain: Math.floor(Math.random() * 200),
    risingScore: Math.random() * 100
  }))

  return rising
    .sort((a, b) => b.risingScore - a.risingScore)
    .slice(0, limit)
}

// Get popular battles of all time
export async function getPopularBattles(limit: number = 20): Promise<Battle[]> {
  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(id, username, avatar_url, elo_rating),
      player2:profiles!battles_player2_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching popular battles:', error)
    return []
  }
  return data || []
}
