import { supabase, Profile, Beat } from './client'

export interface Spectator {
  id: string
  battle_id: string
  user_id: string
  joined_at: string
  user?: Profile
}

export interface Vote {
  id: string
  battle_id: string
  voter_id: string
  voted_for_player_id: string
  round_number: number | null
  created_at: string
  voter?: Profile
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
  voting_style: 'per_round' | 'overall'
  show_votes_during_battle: boolean
  player1?: Profile
  player2?: Profile
  beat?: Beat
  spectators?: Spectator[]
  votes?: Vote[]
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

export interface CreateBattleOptions {
  player1Id: string
  roomCode: string
  totalRounds?: number
  votingStyle?: 'per_round' | 'overall'
  showVotesDuringBattle?: boolean
  beatId?: string | null
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
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

// Voting functions
export async function castVote(
  battleId: string,
  visitorId: string,
  votedForPlayerId: string,
  roundNumber: number | null = null
): Promise<Vote | null> {
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

// Chat functions
export interface ChatMessage {
  id: string
  battle_id: string
  user_id: string
  message: string
  created_at: string
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
      message: message.slice(0, 500)
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
