import { supabase, Profile } from './client'

export interface Crew {
  id: string
  name: string
  tag: string
  description: string | null
  avatar_url: string | null
  banner_url: string | null
  leader_id: string
  total_wins: number
  total_losses: number
  elo_rating: number
  created_at: string
  updated_at: string
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
  best_of: number
  created_at: string
  completed_at: string | null
  crew1?: Crew
  crew2?: Crew
  matches?: CrewBattleMatch[]
}

export interface CrewBattleMatch {
  id: string
  crew_battle_id: string
  match_number: number
  player1_id: string
  player2_id: string
  battle_id: string | null
  winner_id: string | null
  status: 'pending' | 'in_progress' | 'complete'
  player1?: Profile
  player2?: Profile
}

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
  const { data: invite, error: inviteError } = await supabase
    .from('crew_invites')
    .select('crew_id')
    .eq('id', inviteId)
    .eq('user_id', userId)
    .single()

  if (inviteError || !invite) {
    return false
  }

  await supabase
    .from('crew_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

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
