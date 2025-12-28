import { supabase, Profile } from './client'

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
