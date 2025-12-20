import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Profile, Battle, ChatMessage, VoteCounts } from './types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)

// Re-export types
export type { Profile, Battle, ChatMessage, VoteCounts }

// Profile functions
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

export async function createProfile(userId: string, username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username,
      elo_rating: 1000,
      wins: 0,
      losses: 0,
      total_battles: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
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

// Battle functions
export async function getBattle(battleId: string): Promise<Battle | null> {
  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(*),
      player2:profiles!battles_player2_id_fkey(*),
      beat:beats(*),
      spectators(*),
      votes(*)
    `)
    .eq('id', battleId)
    .single()

  if (error) {
    console.error('Error fetching battle:', error)
    return null
  }
  return data
}

export async function createBattle(
  playerId: string,
  totalRounds: number = 2,
  votingStyle: 'per_round' | 'overall' = 'overall',
  showVotes: boolean = false
): Promise<Battle | null> {
  const roomCode = generateRoomCode()

  const { data, error } = await supabase
    .from('battles')
    .insert({
      room_code: roomCode,
      status: 'waiting',
      player1_id: playerId,
      current_round: 1,
      total_rounds: totalRounds,
      voting_style: votingStyle,
      show_votes_during_battle: showVotes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating battle:', error)
    return null
  }
  return data
}

export async function joinBattle(battleId: string, playerId: string): Promise<Battle | null> {
  const { data, error } = await supabase
    .from('battles')
    .update({
      player2_id: playerId,
      status: 'ready',
    })
    .eq('id', battleId)
    .is('player2_id', null)
    .select()
    .single()

  if (error) {
    console.error('Error joining battle:', error)
    return null
  }
  return data
}

export async function findBattleByCode(roomCode: string): Promise<Battle | null> {
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .eq('status', 'waiting')
    .single()

  if (error) {
    console.error('Error finding battle:', error)
    return null
  }
  return data
}

// Voting functions
export async function castVote(
  battleId: string,
  voterId: string,
  votedForPlayerId: string,
  roundNumber: number | null = null
): Promise<boolean> {
  const { error } = await supabase.from('battle_votes').upsert(
    {
      battle_id: battleId,
      voter_id: voterId,
      voted_for_player_id: votedForPlayerId,
      round_number: roundNumber,
    },
    {
      onConflict: roundNumber ? 'battle_id,voter_id,round_number' : 'battle_id,voter_id',
    }
  )

  if (error) {
    console.error('Error casting vote:', error)
    return false
  }
  return true
}

export async function getVoteCounts(
  battleId: string,
  player1Id: string,
  player2Id: string,
  roundNumber: number | null = null
): Promise<VoteCounts> {
  let query = supabase
    .from('battle_votes')
    .select('voted_for_player_id')
    .eq('battle_id', battleId)

  if (roundNumber !== null) {
    query = query.eq('round_number', roundNumber)
  }

  const { data, error } = await query

  if (error || !data) {
    return { player1Votes: 0, player2Votes: 0, totalVotes: 0 }
  }

  const player1Votes = data.filter((v) => v.voted_for_player_id === player1Id).length
  const player2Votes = data.filter((v) => v.voted_for_player_id === player2Id).length

  return {
    player1Votes,
    player2Votes,
    totalVotes: player1Votes + player2Votes,
  }
}

// Spectator functions
export async function joinAsSpectator(battleId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('battle_spectators').upsert({
    battle_id: battleId,
    user_id: userId,
  })

  if (error) {
    console.error('Error joining as spectator:', error)
    return false
  }
  return true
}

export async function getSpectatorCount(battleId: string): Promise<number> {
  const { count, error } = await supabase
    .from('battle_spectators')
    .select('*', { count: 'exact', head: true })
    .eq('battle_id', battleId)

  if (error) {
    return 0
  }
  return count || 0
}

// Chat functions
export async function sendChatMessage(
  battleId: string,
  userId: string,
  message: string
): Promise<boolean> {
  const { error } = await supabase.from('battle_chat').insert({
    battle_id: battleId,
    user_id: userId,
    message,
  })

  if (error) {
    console.error('Error sending message:', error)
    return false
  }
  return true
}

export async function getChatMessages(battleId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('battle_chat')
    .select(
      `
      *,
      user:profiles(id, username, avatar_url)
    `
    )
    .eq('battle_id', battleId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }
  return data || []
}

// Helpers
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function getAvatarUrl(username: string, avatarUrl?: string | null): string {
  if (avatarUrl) return avatarUrl
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}`
}
