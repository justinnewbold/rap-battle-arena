import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  // Joined data
  player1?: Profile
  player2?: Profile
  beat?: Beat
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

export async function getLeaderboard(limit: number = 10): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('elo_rating', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }
  return data || []
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

export async function createBattle(player1Id: string, roomCode: string): Promise<Battle | null> {
  const { data, error } = await supabase
    .from('battles')
    .insert({
      player1_id: player1Id,
      room_code: roomCode,
      status: 'waiting'
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
