import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Warn in development if environment variables are missing
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    'Supabase environment variables are not configured. ' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// Types
export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  elo_rating: number
  wins: number
  losses: number
  total_battles: number
  created_at: string
  updated_at: string
}

export interface Beat {
  id: string
  name: string
  artist: string
  bpm: number
  audio_url: string
  cover_url: string | null
  duration: number
  is_premium: boolean
}

export interface Battle {
  id: string
  room_code: string
  status: 'waiting' | 'ready' | 'battling' | 'judging' | 'complete' | 'cancelled'
  player1_id: string
  player2_id: string | null
  winner_id: string | null
  current_round: number
  total_rounds: number
  beat_id: string | null
  player1_total_score: number | null
  player2_total_score: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  // Voting settings
  voting_style: 'per_round' | 'overall'
  show_votes_during_battle: boolean
  // Joined data
  player1?: Profile
  player2?: Profile
  beat?: Beat
  spectators?: Spectator[]
  votes?: Vote[]
}

export interface Spectator {
  id: string
  battle_id: string
  user_id: string
  joined_at: string
  // Joined data
  user?: Profile
}

export interface Vote {
  id: string
  battle_id: string
  voter_id: string
  voted_for_player_id: string
  round_number: number | null  // null means overall vote
  created_at: string
  // Joined data
  voter?: Profile
}

export interface BattleRound {
  id: string
  battle_id: string
  round_number: number
  player_id: string
  audio_url: string | null
  transcript: string | null
  duration: number | null
  rhyme_score: number | null
  flow_score: number | null
  punchlines_score: number | null
  delivery_score: number | null
  creativity_score: number | null
  rebuttal_score: number | null
  total_score: number | null
  judge_feedback: string | null
  ai_model_used: string | null
  created_at: string
}

// Helper functions
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating profile:', error)
    return null
  }
  return data
}

export type LeaderboardTimeframe = 'all' | 'month' | 'week'

export interface PaginatedLeaderboard {
  data: Profile[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export async function getLeaderboard(
  limit: number = 10,
  timeframe: LeaderboardTimeframe = 'all',
  page: number = 1
): Promise<PaginatedLeaderboard> {
  const offset = (page - 1) * limit

  // Build the base query for filtering
  let countQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  let dataQuery = supabase
    .from('profiles')
    .select('*')
    .order('elo_rating', { ascending: false })
    .range(offset, offset + limit - 1)

  // Filter by timeframe based on account creation or recent activity
  if (timeframe === 'month') {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    countQuery = countQuery.gte('updated_at', monthAgo.toISOString())
    dataQuery = dataQuery.gte('updated_at', monthAgo.toISOString())
  } else if (timeframe === 'week') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    countQuery = countQuery.gte('updated_at', weekAgo.toISOString())
    dataQuery = dataQuery.gte('updated_at', weekAgo.toISOString())
  }

  const [{ count }, { data, error }] = await Promise.all([
    countQuery,
    dataQuery
  ])

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return { data: [], total: 0, page, pageSize: limit, hasMore: false }
  }

  const total = count || 0
  return {
    data: data || [],
    total,
    page,
    pageSize: limit,
    hasMore: offset + limit < total
  }
}

export async function getBeats(): Promise<Beat[]> {
  const { data, error } = await supabase
    .from('beats')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching beats:', error)
    return []
  }
  return data || []
}

export interface CreateBattleOptions {
  player1Id: string
  roomCode: string
  totalRounds?: number
  votingStyle?: 'per_round' | 'overall'
  showVotesDuringBattle?: boolean
  beatId?: string | null
}

export async function createBattle(options: CreateBattleOptions): Promise<Battle | null> {
  const { data, error } = await supabase
    .from('battles')
    .insert({
      player1_id: options.player1Id,
      room_code: options.roomCode,
      status: 'waiting',
      total_rounds: options.totalRounds || 2,
      voting_style: options.votingStyle || 'overall',
      show_votes_during_battle: options.showVotesDuringBattle ?? false,
      beat_id: options.beatId || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating battle:', error)
    return null
  }
  return data
}

export async function joinBattle(battleId: string, player2Id: string): Promise<Battle | null> {
  const { data, error } = await supabase
    .from('battles')
    .update({
      player2_id: player2Id,
      status: 'ready'
    })
    .eq('id', battleId)
    .select()
    .single()
  
  if (error) {
    console.error('Error joining battle:', error)
    return null
  }
  return data
}

export async function getBattle(battleId: string): Promise<Battle | null> {
  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(*),
      player2:profiles!battles_player2_id_fkey(*),
      beat:beats(*)
    `)
    .eq('id', battleId)
    .single()
  
  if (error) {
    console.error('Error fetching battle:', error)
    return null
  }
  return data
}

export async function findBattleByCode(roomCode: string): Promise<Battle | null> {
  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(*),
      player2:profiles!battles_player2_id_fkey(*)
    `)
    .eq('room_code', roomCode.toUpperCase())
    .single()
  
  if (error) {
    console.error('Error finding battle:', error)
    return null
  }
  return data
}

export async function getRecentBattles(userId: string, limit: number = 5): Promise<Battle[]> {
  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(id, username, avatar_url, elo_rating),
      player2:profiles!battles_player2_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching recent battles:', error)
    return []
  }
  return data || []
}

// Generate a random room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Spectator functions
export async function joinAsSpectator(battleId: string, userId: string): Promise<Spectator | null> {
  const { data, error } = await supabase
    .from('battle_spectators')
    .insert({
      battle_id: battleId,
      user_id: userId
    })
    .select()
    .single()

  if (error) {
    console.error('Error joining as spectator:', error)
    return null
  }
  return data
}

export async function leaveAsSpectator(battleId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('battle_spectators')
    .delete()
    .eq('battle_id', battleId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error leaving as spectator:', error)
    return false
  }
  return true
}

export async function getSpectators(battleId: string): Promise<Spectator[]> {
  const { data, error } = await supabase
    .from('battle_spectators')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .eq('battle_id', battleId)

  if (error) {
    console.error('Error fetching spectators:', error)
    return []
  }
  return data || []
}

export async function getSpectatorCount(battleId: string): Promise<number> {
  const { count, error } = await supabase
    .from('battle_spectators')
    .select('*', { count: 'exact', head: true })
    .eq('battle_id', battleId)

  if (error) {
    console.error('Error counting spectators:', error)
    return 0
  }
  return count || 0
}

// Voting functions
export async function castVote(
  battleId: string,
  visitorId: string,
  votedForPlayerId: string,
  roundNumber: number | null = null
): Promise<Vote | null> {
  // Check if user already voted for this round/overall
  const existingQuery = supabase
    .from('battle_votes')
    .select('id')
    .eq('battle_id', battleId)
    .eq('voter_id', visitorId)

  if (roundNumber !== null) {
    existingQuery.eq('round_number', roundNumber)
  } else {
    existingQuery.is('round_number', null)
  }

  const { data: existing } = await existingQuery.single()

  if (existing) {
    // Update existing vote
    const { data, error } = await supabase
      .from('battle_votes')
      .update({ voted_for_player_id: votedForPlayerId })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating vote:', error)
      return null
    }
    return data
  }

  // Create new vote
  const { data, error } = await supabase
    .from('battle_votes')
    .insert({
      battle_id: battleId,
      voter_id: visitorId,
      voted_for_player_id: votedForPlayerId,
      round_number: roundNumber
    })
    .select()
    .single()

  if (error) {
    console.error('Error casting vote:', error)
    return null
  }
  return data
}

export async function getVotes(battleId: string, roundNumber?: number | null): Promise<Vote[]> {
  let query = supabase
    .from('battle_votes')
    .select(`
      *,
      voter:profiles(id, username, avatar_url)
    `)
    .eq('battle_id', battleId)

  if (roundNumber !== undefined) {
    if (roundNumber === null) {
      query = query.is('round_number', null)
    } else {
      query = query.eq('round_number', roundNumber)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching votes:', error)
    return []
  }
  return data || []
}

export interface VoteCounts {
  player1Votes: number
  player2Votes: number
  totalVotes: number
}

export async function getVoteCounts(
  battleId: string,
  player1Id: string,
  player2Id: string,
  roundNumber?: number | null
): Promise<VoteCounts> {
  const votes = await getVotes(battleId, roundNumber)

  const player1Votes = votes.filter(v => v.voted_for_player_id === player1Id).length
  const player2Votes = votes.filter(v => v.voted_for_player_id === player2Id).length

  return {
    player1Votes,
    player2Votes,
    totalVotes: player1Votes + player2Votes
  }
}

export async function hasUserVoted(
  battleId: string,
  visitorId: string,
  roundNumber?: number | null
): Promise<boolean> {
  let query = supabase
    .from('battle_votes')
    .select('id', { count: 'exact', head: true })
    .eq('battle_id', battleId)
    .eq('voter_id', visitorId)

  if (roundNumber !== undefined) {
    if (roundNumber === null) {
      query = query.is('round_number', null)
    } else {
      query = query.eq('round_number', roundNumber)
    }
  }

  const { count, error } = await query

  if (error) {
    console.error('Error checking vote:', error)
    return false
  }
  return (count || 0) > 0
}

export async function isUserSpectator(battleId: string, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('battle_spectators')
    .select('*', { count: 'exact', head: true })
    .eq('battle_id', battleId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error checking spectator status:', error)
    return false
  }
  return (count || 0) > 0
}

// Chat types and functions
export interface ChatMessage {
  id: string
  battle_id: string
  user_id: string
  message: string
  created_at: string
  // Joined data
  user?: {
    id: string
    username: string
    avatar_url: string | null
  }
}

export async function sendChatMessage(
  battleId: string,
  userId: string,
  message: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('battle_chat')
    .insert({
      battle_id: battleId,
      user_id: userId,
      message: message.slice(0, 500) // Limit message length
    })
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .single()

  if (error) {
    console.error('Error sending chat message:', error)
    return null
  }
  return data
}

export async function getChatMessages(battleId: string, limit: number = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('battle_chat')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .eq('battle_id', battleId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching chat messages:', error)
    return []
  }
  return data || []
}

// Tournament types and functions
export type TournamentStatus = 'upcoming' | 'registration' | 'in_progress' | 'complete'
export type TournamentFormat = 'single_elimination' | 'double_elimination'

export interface Tournament {
  id: string
  name: string
  description: string | null
  format: TournamentFormat
  max_participants: number
  current_participants: number
  status: TournamentStatus
  prize_pool: string | null
  entry_fee: number
  starts_at: string
  registration_ends_at: string
  created_at: string
  created_by: string
  winner_id: string | null
  // Joined data
  creator?: Profile
  winner?: Profile
}

export interface TournamentParticipant {
  id: string
  tournament_id: string
  user_id: string
  seed: number | null
  eliminated: boolean
  placement: number | null
  joined_at: string
  // Joined data
  user?: Profile
}

export interface TournamentMatch {
  id: string
  tournament_id: string
  round: number
  match_number: number
  player1_id: string | null
  player2_id: string | null
  winner_id: string | null
  battle_id: string | null
  scheduled_at: string | null
  status: 'pending' | 'ready' | 'in_progress' | 'complete'
  // Joined data
  player1?: Profile
  player2?: Profile
}

export async function getTournaments(status?: TournamentStatus): Promise<Tournament[]> {
  let query = supabase
    .from('tournaments')
    .select(`
      *,
      creator:profiles!tournaments_created_by_fkey(id, username, avatar_url),
      winner:profiles!tournaments_winner_id_fkey(id, username, avatar_url)
    `)
    .order('starts_at', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tournaments:', error)
    return []
  }
  return data || []
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      creator:profiles!tournaments_created_by_fkey(id, username, avatar_url),
      winner:profiles!tournaments_winner_id_fkey(id, username, avatar_url)
    `)
    .eq('id', tournamentId)
    .single()

  if (error) {
    console.error('Error fetching tournament:', error)
    return null
  }
  return data
}

export async function getTournamentParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
  const { data, error } = await supabase
    .from('tournament_participants')
    .select(`
      *,
      user:profiles(id, username, avatar_url, elo_rating)
    `)
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true })

  if (error) {
    console.error('Error fetching tournament participants:', error)
    return []
  }
  return data || []
}

export async function getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select(`
      *,
      player1:profiles!tournament_matches_player1_id_fkey(id, username, avatar_url),
      player2:profiles!tournament_matches_player2_id_fkey(id, username, avatar_url)
    `)
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true })

  if (error) {
    console.error('Error fetching tournament matches:', error)
    return []
  }
  return data || []
}

export async function joinTournament(tournamentId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tournament_participants')
    .insert({
      tournament_id: tournamentId,
      user_id: userId
    })

  if (error) {
    console.error('Error joining tournament:', error)
    return false
  }
  return true
}

export async function leaveTournament(tournamentId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error leaving tournament:', error)
    return false
  }
  return true
}

export async function isUserInTournament(tournamentId: string, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('tournament_participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error checking tournament participation:', error)
    return false
  }
  return (count || 0) > 0
}

// Friends/Following system
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
  // Joined data
  user?: Profile
  friend?: Profile
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending'
    })

  if (error) {
    console.error('Error sending friend request:', error)
    return false
  }
  return true
}

export async function acceptFriendRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)

  if (error) {
    console.error('Error accepting friend request:', error)
    return false
  }
  return true
}

export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)

  if (error) {
    console.error('Error removing friend:', error)
    return false
  }
  return true
}

export async function getFriends(userId: string): Promise<Profile[]> {
  // Get friendships where user is either the requester or the friend
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      user:profiles!friendships_user_id_fkey(id, username, avatar_url, elo_rating, wins, losses, total_battles),
      friend:profiles!friendships_friend_id_fkey(id, username, avatar_url, elo_rating, wins, losses, total_battles)
    `)
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

  if (error) {
    console.error('Error fetching friends:', error)
    return []
  }

  // Extract the friend profile (the one that isn't the current user)
  return (data || []).map(f => f.user_id === userId ? f.friend : f.user).filter(Boolean) as Profile[]
}

export async function getPendingFriendRequests(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      user:profiles!friendships_user_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error fetching pending requests:', error)
    return []
  }
  return data || []
}

export async function getFriendshipStatus(userId: string, otherUserId: string): Promise<Friendship | null> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`)
    .single()

  if (error) {
    return null
  }
  return data
}

// Achievements system
export type AchievementType =
  | 'first_win'
  | 'first_battle'
  | 'win_streak_5'
  | 'win_streak_10'
  | 'battles_10'
  | 'battles_50'
  | 'battles_100'
  | 'tournament_win'
  | 'tournament_finals'
  | 'elo_1200'
  | 'elo_1500'
  | 'elo_1800'
  | 'elo_2000'
  | 'spectator_favorite'
  | 'social_butterfly'

export interface Achievement {
  id: string
  user_id: string
  achievement_type: AchievementType
  unlocked_at: string
}

export const ACHIEVEMENT_INFO: Record<AchievementType, { name: string; description: string; icon: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }> = {
  first_battle: { name: 'First Steps', description: 'Complete your first battle', icon: '🎤', rarity: 'common' },
  first_win: { name: 'Victory Lap', description: 'Win your first battle', icon: '🏆', rarity: 'common' },
  win_streak_5: { name: 'On Fire', description: 'Win 5 battles in a row', icon: '🔥', rarity: 'rare' },
  win_streak_10: { name: 'Unstoppable', description: 'Win 10 battles in a row', icon: '⚡', rarity: 'epic' },
  battles_10: { name: 'Regular', description: 'Complete 10 battles', icon: '🎯', rarity: 'common' },
  battles_50: { name: 'Veteran', description: 'Complete 50 battles', icon: '⭐', rarity: 'rare' },
  battles_100: { name: 'Legend', description: 'Complete 100 battles', icon: '👑', rarity: 'epic' },
  tournament_win: { name: 'Champion', description: 'Win a tournament', icon: '🏅', rarity: 'legendary' },
  tournament_finals: { name: 'Finalist', description: 'Reach a tournament final', icon: '🥈', rarity: 'epic' },
  elo_1200: { name: 'Gold Status', description: 'Reach 1200 ELO', icon: '🥇', rarity: 'common' },
  elo_1500: { name: 'Diamond Status', description: 'Reach 1500 ELO', icon: '💎', rarity: 'rare' },
  elo_1800: { name: 'Master Status', description: 'Reach 1800 ELO', icon: '🔮', rarity: 'epic' },
  elo_2000: { name: 'Legendary Status', description: 'Reach 2000 ELO', icon: '👑', rarity: 'legendary' },
  spectator_favorite: { name: 'Fan Favorite', description: 'Get 100 total spectator votes', icon: '❤️', rarity: 'rare' },
  social_butterfly: { name: 'Social Butterfly', description: 'Add 10 friends', icon: '🦋', rarity: 'rare' },
}

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.error('Error fetching achievements:', error)
    return []
  }
  return data || []
}

export async function unlockAchievement(userId: string, achievementType: AchievementType): Promise<boolean> {
  // Check if already unlocked
  const { count } = await supabase
    .from('achievements')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('achievement_type', achievementType)

  if (count && count > 0) return false // Already unlocked

  const { error } = await supabase
    .from('achievements')
    .insert({
      user_id: userId,
      achievement_type: achievementType
    })

  if (error) {
    console.error('Error unlocking achievement:', error)
    return false
  }
  return true
}

// Notifications system
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'battle_invite'
  | 'tournament_starting'
  | 'achievement_unlocked'
  | 'battle_result'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

export async function getNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
  return data || []
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }
  return count || 0
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification read:', error)
    return false
  }
  return true
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    console.error('Error marking all notifications read:', error)
    return false
  }
  return true
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      data: data || null
    })

  if (error) {
    console.error('Error creating notification:', error)
    return false
  }
  return true
}

// User settings
export interface UserSettings {
  id: string
  user_id: string
  sound_enabled: boolean
  sound_volume: number
  notifications_enabled: boolean
  notifications_friend_requests: boolean
  notifications_battle_invites: boolean
  notifications_tournament_updates: boolean
  privacy_show_online_status: boolean
  privacy_allow_friend_requests: boolean
  privacy_show_battle_history: boolean
  updated_at: string
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // Create default settings if not found
    if (error.code === 'PGRST116') {
      const defaults = await createDefaultSettings(userId)
      return defaults
    }
    console.error('Error fetching user settings:', error)
    return null
  }
  return data
}

export async function createDefaultSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .insert({
      user_id: userId,
      sound_enabled: true,
      sound_volume: 0.7,
      notifications_enabled: true,
      notifications_friend_requests: true,
      notifications_battle_invites: true,
      notifications_tournament_updates: true,
      privacy_show_online_status: true,
      privacy_allow_friend_requests: true,
      privacy_show_battle_history: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating default settings:', error)
    return null
  }
  return data
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating user settings:', error)
    return false
  }
  return true
}

// Crew/Team system
export interface Crew {
  id: string
  name: string
  tag: string  // 3-4 character tag like [ABC]
  description: string | null
  avatar_url: string | null
  banner_url: string | null
  leader_id: string
  total_wins: number
  total_losses: number
  elo_rating: number
  created_at: string
  updated_at: string
  // Joined data
  leader?: Profile
  members?: CrewMember[]
  member_count?: number
}

export type CrewRole = 'leader' | 'co_leader' | 'member'

export interface CrewMember {
  id: string
  crew_id: string
  user_id: string
  role: CrewRole
  joined_at: string
  // Joined data
  user?: Profile
  crew?: Crew
}

export interface CrewInvite {
  id: string
  crew_id: string
  user_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  // Joined data
  crew?: Crew
  user?: Profile
  inviter?: Profile
}

export interface CrewBattle {
  id: string
  crew1_id: string
  crew2_id: string
  status: 'pending' | 'in_progress' | 'complete'
  winner_crew_id: string | null
  crew1_score: number
  crew2_score: number
  best_of: number  // 3, 5, or 7
  created_at: string
  completed_at: string | null
  // Joined data
  crew1?: Crew
  crew2?: Crew
  matches?: CrewBattleMatch[]
}

export interface CrewBattleMatch {
  id: string
  crew_battle_id: string
  match_number: number
  player1_id: string  // From crew1
  player2_id: string  // From crew2
  battle_id: string | null
  winner_id: string | null
  status: 'pending' | 'in_progress' | 'complete'
  // Joined data
  player1?: Profile
  player2?: Profile
}

// Crew functions
export async function createCrew(
  name: string,
  tag: string,
  leaderId: string,
  description?: string
): Promise<Crew | null> {
  const { data, error } = await supabase
    .from('crews')
    .insert({
      name,
      tag: tag.toUpperCase(),
      leader_id: leaderId,
      description: description || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating crew:', error)
    return null
  }

  // Add leader as member
  await supabase.from('crew_members').insert({
    crew_id: data.id,
    user_id: leaderId,
    role: 'leader'
  })

  return data
}

export async function getCrew(crewId: string): Promise<Crew | null> {
  const { data, error } = await supabase
    .from('crews')
    .select(`
      *,
      leader:profiles!crews_leader_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('id', crewId)
    .single()

  if (error) {
    console.error('Error fetching crew:', error)
    return null
  }
  return data
}

export async function getCrews(limit: number = 20): Promise<Crew[]> {
  const { data, error } = await supabase
    .from('crews')
    .select(`
      *,
      leader:profiles!crews_leader_id_fkey(id, username, avatar_url)
    `)
    .order('elo_rating', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching crews:', error)
    return []
  }
  return data || []
}

export async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
  const { data, error } = await supabase
    .from('crew_members')
    .select(`
      *,
      user:profiles(id, username, avatar_url, elo_rating, wins, losses)
    `)
    .eq('crew_id', crewId)
    .order('role', { ascending: true })

  if (error) {
    console.error('Error fetching crew members:', error)
    return []
  }
  return data || []
}

export async function getUserCrew(userId: string): Promise<Crew | null> {
  const { data: membership, error: memberError } = await supabase
    .from('crew_members')
    .select('crew_id')
    .eq('user_id', userId)
    .single()

  if (memberError || !membership) {
    return null
  }

  return getCrew(membership.crew_id)
}

export async function getUserCrewMembership(userId: string): Promise<CrewMember | null> {
  const { data, error } = await supabase
    .from('crew_members')
    .select(`
      *,
      crew:crews(*)
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    return null
  }
  return data
}

export async function inviteToCrew(crewId: string, userId: string, invitedBy: string): Promise<boolean> {
  const { error } = await supabase
    .from('crew_invites')
    .insert({
      crew_id: crewId,
      user_id: userId,
      invited_by: invitedBy
    })

  if (error) {
    console.error('Error inviting to crew:', error)
    return false
  }
  return true
}

export async function acceptCrewInvite(inviteId: string, userId: string): Promise<boolean> {
  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from('crew_invites')
    .select('crew_id')
    .eq('id', inviteId)
    .eq('user_id', userId)
    .single()

  if (inviteError || !invite) {
    return false
  }

  // Update invite status
  await supabase
    .from('crew_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

  // Add as member
  const { error } = await supabase
    .from('crew_members')
    .insert({
      crew_id: invite.crew_id,
      user_id: userId,
      role: 'member'
    })

  if (error) {
    console.error('Error joining crew:', error)
    return false
  }
  return true
}

export async function declineCrewInvite(inviteId: string): Promise<boolean> {
  const { error } = await supabase
    .from('crew_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)

  if (error) {
    console.error('Error declining invite:', error)
    return false
  }
  return true
}

export async function leaveCrew(crewId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('crew_members')
    .delete()
    .eq('crew_id', crewId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error leaving crew:', error)
    return false
  }
  return true
}

export async function getPendingCrewInvites(userId: string): Promise<CrewInvite[]> {
  const { data, error } = await supabase
    .from('crew_invites')
    .select(`
      *,
      crew:crews(id, name, tag, avatar_url),
      inviter:profiles!crew_invites_invited_by_fkey(id, username, avatar_url)
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error fetching crew invites:', error)
    return []
  }
  return data || []
}

export async function updateCrewMemberRole(crewId: string, userId: string, role: CrewRole): Promise<boolean> {
  const { error } = await supabase
    .from('crew_members')
    .update({ role })
    .eq('crew_id', crewId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating member role:', error)
    return false
  }
  return true
}

export async function getCrewBattles(crewId: string): Promise<CrewBattle[]> {
  const { data, error } = await supabase
    .from('crew_battles')
    .select(`
      *,
      crew1:crews!crew_battles_crew1_id_fkey(id, name, tag, avatar_url),
      crew2:crews!crew_battles_crew2_id_fkey(id, name, tag, avatar_url)
    `)
    .or(`crew1_id.eq.${crewId},crew2_id.eq.${crewId}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching crew battles:', error)
    return []
  }
  return data || []
}

export async function createCrewBattle(
  crew1Id: string,
  crew2Id: string,
  bestOf: number = 3
): Promise<CrewBattle | null> {
  const { data, error } = await supabase
    .from('crew_battles')
    .insert({
      crew1_id: crew1Id,
      crew2_id: crew2Id,
      best_of: bestOf,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating crew battle:', error)
    return null
  }
  return data
}

export async function searchCrews(query: string): Promise<Crew[]> {
  if (!query || query.length < 2) return []

  // Sanitize query to prevent injection - escape special PostgREST characters
  const sanitizedQuery = query.replace(/[%_\\'"(),]/g, '')

  if (!sanitizedQuery) return []

  const { data, error } = await supabase
    .from('crews')
    .select(`
      *,
      leader:profiles!crews_leader_id_fkey(id, username, avatar_url)
    `)
    .or(`name.ilike.%${sanitizedQuery}%,tag.ilike.%${sanitizedQuery}%`)
    .limit(20)

  if (error) {
    console.error('Error searching crews:', error)
    return []
  }
  return data || []
}

export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query || query.length < 2) return []

  // Sanitize query to prevent injection
  const sanitizedQuery = query.replace(/[%_\\'"(),]/g, '')

  if (!sanitizedQuery) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${sanitizedQuery}%`)
    .order('elo_rating', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error searching users:', error)
    return []
  }
  return data || []
}

// Battle rounds functions
export async function getBattleRounds(battleId: string): Promise<BattleRound[]> {
  const { data, error } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('battle_id', battleId)
    .order('round_number', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching battle rounds:', error)
    return []
  }
  return data || []
}

export async function getBattleWithDetails(battleId: string): Promise<{
  battle: Battle | null
  rounds: BattleRound[]
  votes: Vote[]
}> {
  const [battle, rounds, votes] = await Promise.all([
    getBattle(battleId),
    getBattleRounds(battleId),
    getVotes(battleId)
  ])

  return { battle, rounds, votes }
}

// Custom beat upload functions
export interface UserBeat extends Beat {
  uploaded_by: string
  is_public: boolean
  play_count: number
}

export async function uploadBeat(
  userId: string,
  name: string,
  artist: string,
  bpm: number,
  audioUrl: string,
  duration: number,
  coverUrl?: string,
  isPublic: boolean = false
): Promise<UserBeat | null> {
  const { data, error } = await supabase
    .from('beats')
    .insert({
      name,
      artist,
      bpm,
      audio_url: audioUrl,
      cover_url: coverUrl || null,
      duration,
      is_premium: false,
      uploaded_by: userId,
      is_public: isPublic
    })
    .select()
    .single()

  if (error) {
    console.error('Error uploading beat:', error)
    return null
  }
  return data
}

export async function getUserBeats(userId: string): Promise<UserBeat[]> {
  const { data, error } = await supabase
    .from('beats')
    .select('*')
    .eq('uploaded_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user beats:', error)
    return []
  }
  return data || []
}

export async function getPublicBeats(): Promise<UserBeat[]> {
  const { data, error } = await supabase
    .from('beats')
    .select('*')
    .eq('is_public', true)
    .order('play_count', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching public beats:', error)
    return []
  }
  return data || []
}

export async function deleteBeat(beatId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('beats')
    .delete()
    .eq('id', beatId)
    .eq('uploaded_by', userId)

  if (error) {
    console.error('Error deleting beat:', error)
    return false
  }
  return true
}

export async function incrementBeatPlayCount(beatId: string): Promise<void> {
  await supabase.rpc('increment_beat_play_count', { beat_id: beatId })
}

// Upload file to Supabase Storage
export async function uploadBeatFile(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('beats')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading beat file:', error)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from('beats')
    .getPublicUrl(fileName)

  return publicUrl
}

export async function uploadBeatCover(file: File, userId: string): Promise<string | null> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/covers/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('beats')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading beat cover:', error)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from('beats')
    .getPublicUrl(fileName)

  return publicUrl
}
