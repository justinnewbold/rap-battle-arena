// Advanced Battle Modes
// Battle Royale, Tag Team, Cypher, Regional Leagues, Hall of Fame

import { supabase, Profile, Battle, BattleRound } from './supabase'

// ===========================================
// BATTLE ROYALE MODE
// ===========================================

export type BattleRoyaleStatus = 'registration' | 'starting' | 'in_progress' | 'complete'
export type BattleRoyaleRoundType = 'group' | 'elimination' | 'finals'

export interface BattleRoyale {
  id: string
  name: string
  description: string | null
  max_participants: number // 8, 16, or 32
  current_participants: number
  entry_fee: number
  prize_pool: number
  status: BattleRoyaleStatus
  current_round: number
  total_rounds: number
  beat_id: string | null
  elimination_style: 'single' | 'double' | 'points'
  time_limit_seconds: number
  registration_deadline: string
  started_at: string | null
  completed_at: string | null
  winner_id: string | null
  created_by: string
  created_at: string
  // Joined
  participants?: BattleRoyaleParticipant[]
  winner?: Profile
}

export interface BattleRoyaleParticipant {
  id: string
  royale_id: string
  user_id: string
  status: 'active' | 'eliminated' | 'winner'
  total_score: number
  rounds_won: number
  rounds_played: number
  elimination_round: number | null
  seed: number | null
  joined_at: string
  // Joined
  user?: Profile
}

export interface BattleRoyaleMatch {
  id: string
  royale_id: string
  round_number: number
  round_type: BattleRoyaleRoundType
  match_number: number
  player1_id: string
  player2_id: string
  winner_id: string | null
  player1_score: number
  player2_score: number
  battle_id: string | null
  status: 'pending' | 'in_progress' | 'complete'
  scheduled_for: string | null
  completed_at: string | null
  // Joined
  player1?: Profile
  player2?: Profile
}

// Create battle royale
export async function createBattleRoyale(
  creatorId: string,
  name: string,
  maxParticipants: 8 | 16 | 32,
  entryFee: number,
  registrationDeadline: string,
  options: {
    description?: string
    eliminationStyle?: BattleRoyale['elimination_style']
    timeLimitSeconds?: number
    beatId?: string
  } = {}
): Promise<BattleRoyale | null> {
  // Calculate rounds based on participants
  const totalRounds = Math.log2(maxParticipants)

  const { data, error } = await supabase
    .from('battle_royales')
    .insert({
      name,
      description: options.description || null,
      max_participants: maxParticipants,
      entry_fee: entryFee,
      prize_pool: entryFee * maxParticipants * 0.9, // 10% platform fee
      status: 'registration',
      total_rounds: totalRounds,
      elimination_style: options.eliminationStyle || 'single',
      time_limit_seconds: options.timeLimitSeconds || 60,
      beat_id: options.beatId || null,
      registration_deadline: registrationDeadline,
      created_by: creatorId
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating battle royale:', error)
    return null
  }
  return data
}

// Join battle royale
export async function joinBattleRoyale(royaleId: string, userId: string): Promise<boolean> {
  const { data: royale } = await supabase
    .from('battle_royales')
    .select('current_participants, max_participants, entry_fee, status')
    .eq('id', royaleId)
    .single()

  if (!royale || royale.status !== 'registration') {
    console.error('Battle royale not accepting registrations')
    return false
  }

  if (royale.current_participants >= royale.max_participants) {
    console.error('Battle royale is full')
    return false
  }

  // Deduct entry fee
  if (royale.entry_fee > 0) {
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (!wallet || wallet.balance < royale.entry_fee) {
      console.error('Insufficient balance')
      return false
    }

    await supabase.rpc('spend_coins_from_wallet', {
      p_user_id: userId,
      p_amount: royale.entry_fee
    })
  }

  // Add participant
  const { error } = await supabase
    .from('battle_royale_participants')
    .insert({
      royale_id: royaleId,
      user_id: userId,
      status: 'active'
    })

  if (error) {
    console.error('Error joining battle royale:', error)
    return false
  }

  // Update participant count
  await supabase
    .from('battle_royales')
    .update({ current_participants: royale.current_participants + 1 })
    .eq('id', royaleId)

  return true
}

// Start battle royale (generate bracket)
export async function startBattleRoyale(royaleId: string): Promise<boolean> {
  const { data: royale } = await supabase
    .from('battle_royales')
    .select('*, participants:battle_royale_participants(*)')
    .eq('id', royaleId)
    .single()

  if (!royale || royale.status !== 'registration') {
    return false
  }

  // Shuffle and seed participants
  const participants = royale.participants || []
  const shuffled = participants.sort(() => Math.random() - 0.5)

  // Assign seeds
  for (let i = 0; i < shuffled.length; i++) {
    await supabase
      .from('battle_royale_participants')
      .update({ seed: i + 1 })
      .eq('id', shuffled[i].id)
  }

  // Generate first round matches
  const matches: Omit<BattleRoyaleMatch, 'id' | 'player1' | 'player2'>[] = []
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      royale_id: royaleId,
      round_number: 1,
      round_type: shuffled.length > 8 ? 'group' : 'elimination',
      match_number: Math.floor(i / 2) + 1,
      player1_id: shuffled[i].user_id,
      player2_id: shuffled[i + 1]?.user_id || shuffled[i].user_id, // Bye if odd
      winner_id: shuffled[i + 1] ? null : shuffled[i].user_id, // Auto-win for bye
      player1_score: 0,
      player2_score: 0,
      status: shuffled[i + 1] ? 'pending' : 'complete'
    })
  }

  await supabase.from('battle_royale_matches').insert(matches)

  // Update status
  await supabase
    .from('battle_royales')
    .update({
      status: 'in_progress',
      current_round: 1,
      started_at: new Date().toISOString()
    })
    .eq('id', royaleId)

  return true
}

// Get active battle royales
export async function getActiveBattleRoyales(): Promise<BattleRoyale[]> {
  const { data, error } = await supabase
    .from('battle_royales')
    .select(`
      *,
      participants:battle_royale_participants(count)
    `)
    .in('status', ['registration', 'in_progress'])
    .order('registration_deadline', { ascending: true })

  if (error) {
    console.error('Error fetching battle royales:', error)
    return []
  }
  return data || []
}

// Get battle royale details
export async function getBattleRoyale(royaleId: string): Promise<BattleRoyale | null> {
  const { data, error } = await supabase
    .from('battle_royales')
    .select(`
      *,
      participants:battle_royale_participants(*, user:profiles(*)),
      winner:profiles(*)
    `)
    .eq('id', royaleId)
    .single()

  if (error) return null
  return data
}

// Get bracket/matches for a round
export async function getBattleRoyaleMatches(
  royaleId: string,
  roundNumber?: number
): Promise<BattleRoyaleMatch[]> {
  let query = supabase
    .from('battle_royale_matches')
    .select(`
      *,
      player1:profiles!battle_royale_matches_player1_id_fkey(id, username, avatar_url, elo_rating),
      player2:profiles!battle_royale_matches_player2_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('royale_id', royaleId)
    .order('round_number')
    .order('match_number')

  if (roundNumber) {
    query = query.eq('round_number', roundNumber)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching matches:', error)
    return []
  }
  return data || []
}

// ===========================================
// TAG TEAM BATTLES
// ===========================================

export interface TagTeamBattle {
  id: string
  room_code: string
  status: 'forming' | 'ready' | 'in_progress' | 'complete'
  team1: TagTeamTeam
  team2: TagTeamTeam
  current_round: number
  total_rounds: number
  current_turn: 'team1' | 'team2'
  current_player_index: number // 0 or 1 (which teammate)
  beat_id: string | null
  tag_style: 'alternating' | 'relay' | 'freestyle'
  winner_team: 1 | 2 | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface TagTeamTeam {
  player1_id: string
  player2_id: string | null
  player1?: Profile
  player2?: Profile
  total_score: number
  tag_count: number // Number of times they tagged in
}

export interface TagTeamRound {
  id: string
  battle_id: string
  round_number: number
  segments: TagTeamSegment[]
  team1_score: number
  team2_score: number
  winner_team: 1 | 2 | null
}

export interface TagTeamSegment {
  team: 1 | 2
  player_id: string
  start_time: number
  end_time: number
  audio_url: string | null
  transcript: string | null
  score: number
  was_tag_in: boolean
}

// Create tag team battle
export async function createTagTeamBattle(
  creatorId: string,
  partnerId: string | null,
  options: {
    tagStyle?: TagTeamBattle['tag_style']
    totalRounds?: number
    beatId?: string
  } = {}
): Promise<TagTeamBattle | null> {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { data, error } = await supabase
    .from('tag_team_battles')
    .insert({
      room_code: roomCode,
      status: 'forming',
      team1_player1_id: creatorId,
      team1_player2_id: partnerId,
      total_rounds: options.totalRounds || 3,
      tag_style: options.tagStyle || 'alternating',
      beat_id: options.beatId || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tag team battle:', error)
    return null
  }
  return data
}

// Tag in teammate (switch who's rapping)
export async function tagInTeammate(
  battleId: string,
  currentPlayerId: string,
  teammateId: string
): Promise<boolean> {
  // Verify it's a valid tag
  const { data: battle } = await supabase
    .from('tag_team_battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (!battle || battle.status !== 'in_progress') {
    return false
  }

  // Record the tag
  await supabase.from('tag_team_events').insert({
    battle_id: battleId,
    event_type: 'tag_in',
    from_player_id: currentPlayerId,
    to_player_id: teammateId,
    round_number: battle.current_round
  })

  // Update current player
  const isTeam1 = battle.team1_player1_id === currentPlayerId || battle.team1_player2_id === currentPlayerId
  const newPlayerIndex = isTeam1
    ? (battle.team1_player1_id === teammateId ? 0 : 1)
    : (battle.team2_player1_id === teammateId ? 0 : 1)

  await supabase
    .from('tag_team_battles')
    .update({ current_player_index: newPlayerIndex })
    .eq('id', battleId)

  return true
}

// ===========================================
// CYPHER MODE
// ===========================================

export type CypherStatus = 'open' | 'active' | 'closed'

export interface Cypher {
  id: string
  name: string
  description: string | null
  host_id: string
  beat_id: string | null
  status: CypherStatus
  max_participants: number | null
  current_participants: number
  turn_duration_seconds: number
  min_turns_per_person: number
  rotation_style: 'round_robin' | 'volunteer' | 'random'
  is_public: boolean
  started_at: string | null
  ended_at: string | null
  created_at: string
  // Joined
  host?: Profile
  participants?: CypherParticipant[]
}

export interface CypherParticipant {
  id: string
  cypher_id: string
  user_id: string
  turns_taken: number
  total_score: number
  joined_at: string
  left_at: string | null
  // Joined
  user?: Profile
}

export interface CypherTurn {
  id: string
  cypher_id: string
  participant_id: string
  turn_number: number
  audio_url: string | null
  transcript: string | null
  duration_seconds: number
  score: number | null
  reactions: Record<string, number> // emoji -> count
  created_at: string
}

// Create cypher
export async function createCypher(
  hostId: string,
  name: string,
  options: {
    description?: string
    beatId?: string
    maxParticipants?: number
    turnDurationSeconds?: number
    rotationStyle?: Cypher['rotation_style']
    isPublic?: boolean
  } = {}
): Promise<Cypher | null> {
  const { data, error } = await supabase
    .from('cyphers')
    .insert({
      name,
      host_id: hostId,
      description: options.description || null,
      beat_id: options.beatId || null,
      max_participants: options.maxParticipants || null,
      turn_duration_seconds: options.turnDurationSeconds || 60,
      rotation_style: options.rotationStyle || 'round_robin',
      is_public: options.isPublic ?? true,
      status: 'open'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating cypher:', error)
    return null
  }

  // Add host as participant
  await supabase.from('cypher_participants').insert({
    cypher_id: data.id,
    user_id: hostId
  })

  return data
}

// Join cypher
export async function joinCypher(cypherId: string, userId: string): Promise<boolean> {
  const { data: cypher } = await supabase
    .from('cyphers')
    .select('max_participants, current_participants, status')
    .eq('id', cypherId)
    .single()

  if (!cypher || cypher.status === 'closed') {
    return false
  }

  if (cypher.max_participants && cypher.current_participants >= cypher.max_participants) {
    return false
  }

  const { error } = await supabase
    .from('cypher_participants')
    .insert({
      cypher_id: cypherId,
      user_id: userId
    })

  if (error) {
    console.error('Error joining cypher:', error)
    return false
  }

  await supabase
    .from('cyphers')
    .update({ current_participants: cypher.current_participants + 1 })
    .eq('id', cypherId)

  return true
}

// Get next participant in rotation
export async function getNextCypherParticipant(cypherId: string): Promise<string | null> {
  const { data: cypher } = await supabase
    .from('cyphers')
    .select('rotation_style')
    .eq('id', cypherId)
    .single()

  const { data: participants } = await supabase
    .from('cypher_participants')
    .select('*')
    .eq('cypher_id', cypherId)
    .is('left_at', null)
    .order('turns_taken', { ascending: true })

  if (!participants || participants.length === 0) return null

  switch (cypher?.rotation_style) {
    case 'round_robin':
      // Person with fewest turns goes next
      return participants[0].user_id
    case 'random':
      return participants[Math.floor(Math.random() * participants.length)].user_id
    case 'volunteer':
      return null // UI handles volunteer selection
    default:
      return participants[0].user_id
  }
}

// Submit cypher turn
export async function submitCypherTurn(
  cypherId: string,
  userId: string,
  audioUrl: string,
  transcript: string,
  durationSeconds: number
): Promise<CypherTurn | null> {
  // Get participant
  const { data: participant } = await supabase
    .from('cypher_participants')
    .select('id, turns_taken')
    .eq('cypher_id', cypherId)
    .eq('user_id', userId)
    .single()

  if (!participant) return null

  // Get turn number
  const { count } = await supabase
    .from('cypher_turns')
    .select('*', { count: 'exact', head: true })
    .eq('cypher_id', cypherId)

  const turnNumber = (count || 0) + 1

  const { data, error } = await supabase
    .from('cypher_turns')
    .insert({
      cypher_id: cypherId,
      participant_id: participant.id,
      turn_number: turnNumber,
      audio_url: audioUrl,
      transcript,
      duration_seconds: durationSeconds,
      reactions: {}
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting cypher turn:', error)
    return null
  }

  // Update participant turns
  await supabase
    .from('cypher_participants')
    .update({ turns_taken: participant.turns_taken + 1 })
    .eq('id', participant.id)

  return data
}

// Get active cyphers
export async function getActiveCyphers(limit: number = 20): Promise<Cypher[]> {
  const { data, error } = await supabase
    .from('cyphers')
    .select(`
      *,
      host:profiles(id, username, avatar_url)
    `)
    .in('status', ['open', 'active'])
    .eq('is_public', true)
    .order('current_participants', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching cyphers:', error)
    return []
  }
  return data || []
}

// ===========================================
// REGIONAL LEAGUES
// ===========================================

export interface Region {
  id: string
  code: string // e.g., 'na-east', 'eu-west'
  name: string
  country_codes: string[]
  timezone: string
  is_active: boolean
}

export interface RegionalLeague {
  id: string
  region_id: string
  season_number: number
  name: string
  description: string | null
  tier: 'open' | 'amateur' | 'pro' | 'elite'
  max_participants: number
  current_participants: number
  prize_pool: number
  entry_requirements: {
    minElo?: number
    maxElo?: number
    minBattles?: number
    mustBeFromRegion?: boolean
  }
  schedule: LeagueSchedule
  status: 'registration' | 'group_stage' | 'playoffs' | 'finals' | 'complete'
  started_at: string | null
  ends_at: string | null
  created_at: string
  // Joined
  region?: Region
  standings?: RegionalLeagueStanding[]
}

export interface LeagueSchedule {
  registrationEnd: string
  groupStageStart: string
  groupStageEnd: string
  playoffsStart: string
  finalsDate: string
  matchDays: string[] // e.g., ['monday', 'wednesday', 'friday']
  matchTimes: string[] // e.g., ['19:00', '20:00', '21:00']
}

export interface RegionalLeagueStanding {
  id: string
  league_id: string
  user_id: string
  group: string | null // e.g., 'A', 'B', 'C', 'D'
  matches_played: number
  wins: number
  losses: number
  points: number
  score_difference: number
  rank: number
  qualified_for_playoffs: boolean
  // Joined
  user?: Profile
}

// Available regions
export const REGIONS: Region[] = [
  { id: '1', code: 'na-east', name: 'North America East', country_codes: ['US', 'CA'], timezone: 'America/New_York', is_active: true },
  { id: '2', code: 'na-west', name: 'North America West', country_codes: ['US', 'CA'], timezone: 'America/Los_Angeles', is_active: true },
  { id: '3', code: 'eu-west', name: 'Europe West', country_codes: ['GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE'], timezone: 'Europe/London', is_active: true },
  { id: '4', code: 'eu-east', name: 'Europe East', country_codes: ['PL', 'CZ', 'RO', 'HU', 'UA'], timezone: 'Europe/Warsaw', is_active: true },
  { id: '5', code: 'latam', name: 'Latin America', country_codes: ['MX', 'BR', 'AR', 'CO', 'CL'], timezone: 'America/Mexico_City', is_active: true },
  { id: '6', code: 'asia', name: 'Asia Pacific', country_codes: ['JP', 'KR', 'AU', 'NZ', 'SG'], timezone: 'Asia/Tokyo', is_active: true }
]

// Get regional leagues
export async function getRegionalLeagues(regionCode?: string): Promise<RegionalLeague[]> {
  let query = supabase
    .from('regional_leagues')
    .select(`
      *,
      region:regions(*)
    `)
    .in('status', ['registration', 'group_stage', 'playoffs', 'finals'])

  if (regionCode) {
    query = query.eq('regions.code', regionCode)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching regional leagues:', error)
    return []
  }
  return data || []
}

// Join regional league
export async function joinRegionalLeague(leagueId: string, userId: string): Promise<boolean> {
  const { data: league } = await supabase
    .from('regional_leagues')
    .select('*, region:regions(*)')
    .eq('id', leagueId)
    .single()

  if (!league || league.status !== 'registration') {
    return false
  }

  // Check entry requirements
  const { data: profile } = await supabase
    .from('profiles')
    .select('elo_rating, total_battles, country_code')
    .eq('id', userId)
    .single()

  if (!profile) return false

  const req = league.entry_requirements
  if (req.minElo && profile.elo_rating < req.minElo) return false
  if (req.maxElo && profile.elo_rating > req.maxElo) return false
  if (req.minBattles && profile.total_battles < req.minBattles) return false
  if (req.mustBeFromRegion && !league.region?.country_codes.includes(profile.country_code)) return false

  const { error } = await supabase
    .from('regional_league_standings')
    .insert({
      league_id: leagueId,
      user_id: userId,
      points: 0
    })

  if (error) {
    console.error('Error joining regional league:', error)
    return false
  }

  await supabase
    .from('regional_leagues')
    .update({ current_participants: league.current_participants + 1 })
    .eq('id', leagueId)

  return true
}

// Get league standings
export async function getLeagueStandings(leagueId: string): Promise<RegionalLeagueStanding[]> {
  const { data, error } = await supabase
    .from('regional_league_standings')
    .select(`
      *,
      user:profiles(id, username, avatar_url, elo_rating)
    `)
    .eq('league_id', leagueId)
    .order('points', { ascending: false })
    .order('score_difference', { ascending: false })

  if (error) {
    console.error('Error fetching standings:', error)
    return []
  }
  return data || []
}

// ===========================================
// HALL OF FAME
// ===========================================

export type HallOfFameCategory =
  | 'legendary_battles'
  | 'greatest_comebacks'
  | 'perfect_scores'
  | 'tournament_champions'
  | 'community_favorites'
  | 'most_improved'
  | 'longest_streaks'

export interface HallOfFameEntry {
  id: string
  category: HallOfFameCategory
  user_id: string | null
  battle_id: string | null
  title: string
  description: string
  achievement_value: number | null // e.g., streak count, score
  achievement_date: string
  featured: boolean
  votes: number
  created_at: string
  // Joined
  user?: Profile
  battle?: Battle
}

export interface HallOfFameNomination {
  id: string
  category: HallOfFameCategory
  nominator_id: string
  nominated_user_id: string | null
  nominated_battle_id: string | null
  reason: string
  votes: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  // Joined
  nominator?: Profile
  nominated_user?: Profile
}

// Hall of Fame categories with descriptions
export const HALL_OF_FAME_CATEGORIES: Record<HallOfFameCategory, { name: string; description: string; icon: string }> = {
  legendary_battles: {
    name: 'Legendary Battles',
    description: 'The most iconic battles in arena history',
    icon: '⚔️'
  },
  greatest_comebacks: {
    name: 'Greatest Comebacks',
    description: 'Against all odds, they turned it around',
    icon: '🔥'
  },
  perfect_scores: {
    name: 'Perfect Scores',
    description: 'Achieved the impossible - 100/100',
    icon: '💯'
  },
  tournament_champions: {
    name: 'Tournament Champions',
    description: 'Winners of major tournaments',
    icon: '🏆'
  },
  community_favorites: {
    name: 'Community Favorites',
    description: 'Voted by the community as the best',
    icon: '❤️'
  },
  most_improved: {
    name: 'Most Improved',
    description: 'Showed incredible growth and dedication',
    icon: '📈'
  },
  longest_streaks: {
    name: 'Longest Streaks',
    description: 'Unstoppable winning streaks',
    icon: '🔥'
  }
}

// Get Hall of Fame entries
export async function getHallOfFameEntries(
  category?: HallOfFameCategory,
  limit: number = 50
): Promise<HallOfFameEntry[]> {
  let query = supabase
    .from('hall_of_fame')
    .select(`
      *,
      user:profiles(id, username, avatar_url, elo_rating),
      battle:battles(id, room_code, player1_id, player2_id)
    `)
    .order('featured', { ascending: false })
    .order('votes', { ascending: false })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching hall of fame:', error)
    return []
  }
  return data || []
}

// Nominate for Hall of Fame
export async function nominateForHallOfFame(
  nominatorId: string,
  category: HallOfFameCategory,
  reason: string,
  options: {
    userId?: string
    battleId?: string
  }
): Promise<HallOfFameNomination | null> {
  const { data, error } = await supabase
    .from('hall_of_fame_nominations')
    .insert({
      category,
      nominator_id: nominatorId,
      nominated_user_id: options.userId || null,
      nominated_battle_id: options.battleId || null,
      reason,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating nomination:', error)
    return null
  }
  return data
}

// Vote for nomination
export async function voteForNomination(nominationId: string, userId: string): Promise<boolean> {
  // Check if already voted
  const { count } = await supabase
    .from('hall_of_fame_votes')
    .select('*', { count: 'exact', head: true })
    .eq('nomination_id', nominationId)
    .eq('user_id', userId)

  if (count && count > 0) return false

  const { error } = await supabase
    .from('hall_of_fame_votes')
    .insert({
      nomination_id: nominationId,
      user_id: userId
    })

  if (error) {
    console.error('Error voting:', error)
    return false
  }

  // Increment vote count
  await supabase.rpc('increment_nomination_votes', { p_nomination_id: nominationId })

  return true
}

// Get pending nominations
export async function getPendingNominations(limit: number = 20): Promise<HallOfFameNomination[]> {
  const { data, error } = await supabase
    .from('hall_of_fame_nominations')
    .select(`
      *,
      nominator:profiles!hall_of_fame_nominations_nominator_id_fkey(id, username, avatar_url),
      nominated_user:profiles!hall_of_fame_nominations_nominated_user_id_fkey(id, username, avatar_url)
    `)
    .eq('status', 'pending')
    .order('votes', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching nominations:', error)
    return []
  }
  return data || []
}

// Induct to Hall of Fame (admin action)
export async function inductToHallOfFame(
  nominationId: string,
  title: string,
  description: string,
  featured: boolean = false
): Promise<boolean> {
  const { data: nomination } = await supabase
    .from('hall_of_fame_nominations')
    .select('*')
    .eq('id', nominationId)
    .single()

  if (!nomination) return false

  // Create hall of fame entry
  const { error } = await supabase
    .from('hall_of_fame')
    .insert({
      category: nomination.category,
      user_id: nomination.nominated_user_id,
      battle_id: nomination.nominated_battle_id,
      title,
      description,
      achievement_date: new Date().toISOString(),
      featured,
      votes: nomination.votes
    })

  if (error) {
    console.error('Error inducting to hall of fame:', error)
    return false
  }

  // Update nomination status
  await supabase
    .from('hall_of_fame_nominations')
    .update({ status: 'approved' })
    .eq('id', nominationId)

  // Notify the inducted user
  if (nomination.nominated_user_id) {
    await supabase.from('notifications').insert({
      user_id: nomination.nominated_user_id,
      type: 'hall_of_fame',
      title: 'Hall of Fame Induction!',
      message: `You've been inducted into the Hall of Fame: ${title}`,
      data: { category: nomination.category }
    })
  }

  return true
}
