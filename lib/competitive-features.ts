import { supabase, Profile, Tournament } from './supabase'

// Ranked Seasons
export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster' | 'legend'

export interface RankedSeason {
  id: string
  name: string
  number: number
  starts_at: string
  ends_at: string
  is_active: boolean
  reward_pool: number
  total_participants: number
  created_at: string
}

export interface SeasonRank {
  tier: RankTier
  division: 1 | 2 | 3 | 4  // e.g., Gold 1, Gold 2, etc.
  lp: number  // League Points (0-100)
  minElo: number
  maxElo: number
  icon: string
  color: string
}

export interface UserSeasonRank {
  id: string
  user_id: string
  season_id: string
  tier: RankTier
  division: number
  lp: number
  peak_tier: RankTier
  peak_division: number
  wins: number
  losses: number
  win_streak: number
  best_win_streak: number
  last_match_at: string | null
  placement_matches_remaining: number
  created_at: string
  updated_at: string
  // Joined
  user?: Profile
  season?: RankedSeason
}

export interface SeasonReward {
  id: string
  season_id: string
  tier: RankTier
  min_division: number
  reward_type: 'coins' | 'avatar' | 'title' | 'border' | 'emote'
  reward_value: string
  reward_name: string
  reward_description: string
}

// Rank tier configurations
export const RANK_TIERS: Record<RankTier, SeasonRank> = {
  bronze: { tier: 'bronze', division: 4, lp: 0, minElo: 0, maxElo: 1099, icon: '🥉', color: '#cd7f32' },
  silver: { tier: 'silver', division: 4, lp: 0, minElo: 1100, maxElo: 1299, icon: '🥈', color: '#c0c0c0' },
  gold: { tier: 'gold', division: 4, lp: 0, minElo: 1300, maxElo: 1499, icon: '🥇', color: '#ffd700' },
  platinum: { tier: 'platinum', division: 4, lp: 0, minElo: 1500, maxElo: 1699, icon: '💎', color: '#00d4aa' },
  diamond: { tier: 'diamond', division: 4, lp: 0, minElo: 1700, maxElo: 1899, icon: '💠', color: '#b9f2ff' },
  master: { tier: 'master', division: 1, lp: 0, minElo: 1900, maxElo: 2099, icon: '👑', color: '#9b59b6' },
  grandmaster: { tier: 'grandmaster', division: 1, lp: 0, minElo: 2100, maxElo: 2299, icon: '🏆', color: '#e74c3c' },
  legend: { tier: 'legend', division: 1, lp: 0, minElo: 2300, maxElo: 9999, icon: '⚡', color: '#f39c12' }
}

// Calculate rank from ELO
export function calculateRankFromElo(elo: number): { tier: RankTier; division: number } {
  const tiers = Object.entries(RANK_TIERS).sort((a, b) => b[1].minElo - a[1].minElo)

  for (const [tierName, tierData] of tiers) {
    if (elo >= tierData.minElo) {
      // Calculate division within tier
      const tierRange = tierData.maxElo - tierData.minElo
      const position = elo - tierData.minElo
      const divisionRange = tierRange / 4

      let division = 4 - Math.floor(position / divisionRange)
      if (division < 1) division = 1
      if (division > 4) division = 4

      // Master+ only has 1 division
      if (['master', 'grandmaster', 'legend'].includes(tierName)) {
        division = 1
      }

      return { tier: tierName as RankTier, division }
    }
  }

  return { tier: 'bronze', division: 4 }
}

// Get current ranked season
export async function getCurrentRankedSeason(): Promise<RankedSeason | null> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ranked_seasons')
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

// Get user's season rank
export async function getUserSeasonRank(userId: string, seasonId: string): Promise<UserSeasonRank | null> {
  const { data, error } = await supabase
    .from('user_season_ranks')
    .select('*, user:profiles(*), season:ranked_seasons(*)')
    .eq('user_id', userId)
    .eq('season_id', seasonId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Create new season rank
      return createUserSeasonRank(userId, seasonId)
    }
    return null
  }
  return data
}

// Create user season rank
async function createUserSeasonRank(userId: string, seasonId: string): Promise<UserSeasonRank | null> {
  // Get user's current ELO
  const { data: profile } = await supabase
    .from('profiles')
    .select('elo_rating')
    .eq('id', userId)
    .single()

  const elo = profile?.elo_rating || 1000
  const { tier, division } = calculateRankFromElo(elo)

  const { data, error } = await supabase
    .from('user_season_ranks')
    .insert({
      user_id: userId,
      season_id: seasonId,
      tier,
      division,
      lp: 0,
      peak_tier: tier,
      peak_division: division,
      placement_matches_remaining: 10
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating season rank:', error)
    return null
  }
  return data
}

// Update rank after match
export async function updateSeasonRank(
  userId: string,
  seasonId: string,
  won: boolean,
  lpChange: number
): Promise<UserSeasonRank | null> {
  const rank = await getUserSeasonRank(userId, seasonId)
  if (!rank) return null

  let newLp = rank.lp + lpChange
  let newTier = rank.tier
  let newDivision = rank.division
  let placementRemaining = rank.placement_matches_remaining

  // Handle placement matches
  if (placementRemaining > 0) {
    placementRemaining--
  }

  // Promotion
  if (newLp >= 100) {
    newLp -= 100

    if (newDivision > 1) {
      newDivision--
    } else {
      // Promote to next tier
      const tierOrder: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend']
      const currentIndex = tierOrder.indexOf(newTier)
      if (currentIndex < tierOrder.length - 1) {
        newTier = tierOrder[currentIndex + 1]
        newDivision = 4
        if (['master', 'grandmaster', 'legend'].includes(newTier)) {
          newDivision = 1
        }
      } else {
        newLp = 100 // Cap at max
      }
    }
  }

  // Demotion
  if (newLp < 0) {
    if (newDivision < 4 && !['master', 'grandmaster', 'legend'].includes(newTier)) {
      newDivision++
      newLp = 75 // Demotion shield
    } else {
      // Demote to lower tier
      const tierOrder: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend']
      const currentIndex = tierOrder.indexOf(newTier)
      if (currentIndex > 0) {
        newTier = tierOrder[currentIndex - 1]
        newDivision = 1
        newLp = 75
      } else {
        newLp = 0 // Can't go below Bronze 4 0 LP
      }
    }
  }

  // Update peak rank
  const tierOrder: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend']
  const peakIndex = tierOrder.indexOf(rank.peak_tier)
  const newIndex = tierOrder.indexOf(newTier)
  const isPeak = newIndex > peakIndex || (newIndex === peakIndex && newDivision < rank.peak_division)

  const newWinStreak = won ? rank.win_streak + 1 : 0
  const bestWinStreak = Math.max(rank.best_win_streak, newWinStreak)

  const { data, error } = await supabase
    .from('user_season_ranks')
    .update({
      tier: newTier,
      division: newDivision,
      lp: Math.max(0, Math.min(100, newLp)),
      peak_tier: isPeak ? newTier : rank.peak_tier,
      peak_division: isPeak ? newDivision : rank.peak_division,
      wins: won ? rank.wins + 1 : rank.wins,
      losses: won ? rank.losses : rank.losses + 1,
      win_streak: newWinStreak,
      best_win_streak: bestWinStreak,
      placement_matches_remaining: placementRemaining,
      last_match_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', rank.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating rank:', error)
    return null
  }
  return data
}

// Get season leaderboard
export async function getSeasonLeaderboard(
  seasonId: string,
  tier?: RankTier,
  limit: number = 100
): Promise<UserSeasonRank[]> {
  let query = supabase
    .from('user_season_ranks')
    .select('*, user:profiles(id, username, avatar_url, elo_rating)')
    .eq('season_id', seasonId)

  if (tier) {
    query = query.eq('tier', tier)
  }

  const { data, error } = await query
    .order('tier', { ascending: false })
    .order('division', { ascending: true })
    .order('lp', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }
  return data || []
}

// Get season rewards
export async function getSeasonRewards(seasonId: string): Promise<SeasonReward[]> {
  const { data, error } = await supabase
    .from('season_rewards')
    .select('*')
    .eq('season_id', seasonId)
    .order('tier', { ascending: false })

  if (error) {
    console.error('Error fetching rewards:', error)
    return []
  }
  return data || []
}

// League System
export interface League {
  id: string
  name: string
  description: string
  tier: RankTier
  region: string | null
  max_members: number
  current_members: number
  prize_pool: number
  entry_fee: number
  season_id: string
  created_by: string | null
  is_official: boolean
  starts_at: string
  ends_at: string
  created_at: string
  // Joined
  members?: LeagueMember[]
}

export interface LeagueMember {
  id: string
  league_id: string
  user_id: string
  points: number
  wins: number
  losses: number
  rank: number
  joined_at: string
  // Joined
  user?: Profile
}

export interface LeagueMatch {
  id: string
  league_id: string
  player1_id: string
  player2_id: string
  battle_id: string | null
  winner_id: string | null
  points_awarded: number
  scheduled_at: string | null
  completed_at: string | null
  status: 'pending' | 'scheduled' | 'in_progress' | 'complete'
  // Joined
  player1?: Profile
  player2?: Profile
}

// Get leagues
export async function getLeagues(
  options: { tier?: RankTier; region?: string; isOfficial?: boolean } = {}
): Promise<League[]> {
  let query = supabase
    .from('leagues')
    .select('*')
    .gt('ends_at', new Date().toISOString())

  if (options.tier) {
    query = query.eq('tier', options.tier)
  }
  if (options.region) {
    query = query.eq('region', options.region)
  }
  if (options.isOfficial !== undefined) {
    query = query.eq('is_official', options.isOfficial)
  }

  const { data, error } = await query.order('starts_at', { ascending: true })

  if (error) {
    console.error('Error fetching leagues:', error)
    return []
  }
  return data || []
}

// Get league details
export async function getLeague(leagueId: string): Promise<League | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single()

  if (error) {
    console.error('Error fetching league:', error)
    return null
  }
  return data
}

// Get league members
export async function getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
  const { data, error } = await supabase
    .from('league_members')
    .select('*, user:profiles(id, username, avatar_url, elo_rating)')
    .eq('league_id', leagueId)
    .order('points', { ascending: false })

  if (error) {
    console.error('Error fetching league members:', error)
    return []
  }
  return data || []
}

// Join a league
export async function joinLeague(leagueId: string, userId: string): Promise<boolean> {
  // Check if league is full
  const { data: league } = await supabase
    .from('leagues')
    .select('current_members, max_members')
    .eq('id', leagueId)
    .single()

  if (!league || league.current_members >= league.max_members) {
    return false
  }

  // Add member
  const { error } = await supabase
    .from('league_members')
    .insert({
      league_id: leagueId,
      user_id: userId
    })

  if (error) {
    console.error('Error joining league:', error)
    return false
  }

  // Update member count
  await supabase
    .from('leagues')
    .update({ current_members: league.current_members + 1 })
    .eq('id', leagueId)

  return true
}

// Get league matches
export async function getLeagueMatches(leagueId: string): Promise<LeagueMatch[]> {
  const { data, error } = await supabase
    .from('league_matches')
    .select(`
      *,
      player1:profiles!league_matches_player1_id_fkey(id, username, avatar_url),
      player2:profiles!league_matches_player2_id_fkey(id, username, avatar_url)
    `)
    .eq('league_id', leagueId)
    .order('scheduled_at', { ascending: true })

  if (error) {
    console.error('Error fetching league matches:', error)
    return []
  }
  return data || []
}

// Update league standings after match
export async function updateLeagueStandings(
  leagueId: string,
  winnerId: string,
  loserId: string,
  pointsAwarded: number
): Promise<void> {
  // Update winner
  const { data: winner } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', leagueId)
    .eq('user_id', winnerId)
    .single()

  if (winner) {
    await supabase
      .from('league_members')
      .update({
        points: winner.points + pointsAwarded,
        wins: winner.wins + 1
      })
      .eq('id', winner.id)
  }

  // Update loser
  const { data: loser } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', leagueId)
    .eq('user_id', loserId)
    .single()

  if (loser) {
    await supabase
      .from('league_members')
      .update({
        losses: loser.losses + 1
      })
      .eq('id', loser.id)
  }

  // Recalculate ranks
  const members = await getLeagueMembers(leagueId)
  for (let i = 0; i < members.length; i++) {
    await supabase
      .from('league_members')
      .update({ rank: i + 1 })
      .eq('id', members[i].id)
  }
}

// Sponsored Tournaments
export interface SponsoredTournament extends Tournament {
  sponsor_name: string
  sponsor_logo_url: string
  sponsor_website: string | null
  sponsor_description: string | null
  total_prize_value: number
  prize_breakdown: Array<{ place: number; prize: string; value: number }>
  promotional_banner_url: string | null
  requirements: {
    min_elo?: number
    max_elo?: number
    min_battles?: number
    region?: string
    premium_only?: boolean
  }
  streaming_url: string | null
  is_featured: boolean
}

// Get sponsored tournaments
export async function getSponsoredTournaments(): Promise<SponsoredTournament[]> {
  const { data, error } = await supabase
    .from('sponsored_tournaments')
    .select(`
      *,
      creator:profiles!tournaments_created_by_fkey(id, username, avatar_url)
    `)
    .in('status', ['upcoming', 'registration', 'in_progress'])
    .order('is_featured', { ascending: false })
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('Error fetching sponsored tournaments:', error)
    return []
  }
  return data || []
}

// Get featured tournament
export async function getFeaturedTournament(): Promise<SponsoredTournament | null> {
  const { data, error } = await supabase
    .from('sponsored_tournaments')
    .select('*')
    .eq('is_featured', true)
    .in('status', ['upcoming', 'registration', 'in_progress'])
    .order('starts_at', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    return null
  }
  return data
}

// Check if user meets tournament requirements
export async function checkTournamentEligibility(
  userId: string,
  tournament: SponsoredTournament
): Promise<{ eligible: boolean; reasons: string[] }> {
  const reasons: string[] = []

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { eligible: false, reasons: ['User not found'] }
  }

  const req = tournament.requirements

  if (req.min_elo && profile.elo_rating < req.min_elo) {
    reasons.push(`Minimum ELO required: ${req.min_elo} (you have ${profile.elo_rating})`)
  }

  if (req.max_elo && profile.elo_rating > req.max_elo) {
    reasons.push(`Maximum ELO allowed: ${req.max_elo} (you have ${profile.elo_rating})`)
  }

  if (req.min_battles && profile.total_battles < req.min_battles) {
    reasons.push(`Minimum ${req.min_battles} battles required (you have ${profile.total_battles})`)
  }

  // Check premium status if required
  if (req.premium_only) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (!subscription || subscription.tier === 'free') {
      reasons.push('Premium subscription required')
    }
  }

  return { eligible: reasons.length === 0, reasons }
}

// Scout Mode - Talent Discovery
export interface ScoutProfile {
  id: string
  user_id: string
  is_discoverable: boolean
  bio: string | null
  looking_for: string[] // ['record_deal', 'collaborations', 'features', 'management']
  genres: string[]
  social_links: Record<string, string>
  portfolio_url: string | null
  contact_email: string | null
  created_at: string
  updated_at: string
  // Joined
  user?: Profile
  highlights?: ScoutHighlight[]
  views?: number
}

export interface ScoutHighlight {
  id: string
  scout_profile_id: string
  battle_round_id: string | null
  title: string
  description: string | null
  audio_url: string | null
  video_url: string | null
  order: number
  created_at: string
}

export interface TalentInquiry {
  id: string
  scout_profile_id: string
  from_user_id: string | null
  from_email: string
  from_name: string
  from_company: string | null
  inquiry_type: 'record_deal' | 'collaboration' | 'feature' | 'management' | 'other'
  message: string
  status: 'pending' | 'read' | 'responded' | 'archived'
  created_at: string
  // Joined
  scout_profile?: ScoutProfile
}

// Create/update scout profile
export async function upsertScoutProfile(
  userId: string,
  data: Partial<Omit<ScoutProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<ScoutProfile | null> {
  const { data: existing } = await supabase
    .from('scout_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    const { data: updated, error } = await supabase
      .from('scout_profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating scout profile:', error)
      return null
    }
    return updated
  }

  const { data: created, error } = await supabase
    .from('scout_profiles')
    .insert({
      user_id: userId,
      is_discoverable: true,
      ...data
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating scout profile:', error)
    return null
  }
  return created
}

// Get scout profile
export async function getScoutProfile(userId: string): Promise<ScoutProfile | null> {
  const { data, error } = await supabase
    .from('scout_profiles')
    .select(`
      *,
      user:profiles(*),
      highlights:scout_highlights(*)
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    return null
  }
  return data
}

// Discover talent
export async function discoverTalent(
  options: {
    genres?: string[]
    lookingFor?: string[]
    minElo?: number
    maxElo?: number
    sortBy?: 'elo' | 'battles' | 'wins' | 'recent'
    limit?: number
    offset?: number
  } = {}
): Promise<ScoutProfile[]> {
  let query = supabase
    .from('scout_profiles')
    .select(`
      *,
      user:profiles(id, username, avatar_url, elo_rating, wins, losses, total_battles, created_at)
    `)
    .eq('is_discoverable', true)

  if (options.genres && options.genres.length > 0) {
    query = query.overlaps('genres', options.genres)
  }

  if (options.lookingFor && options.lookingFor.length > 0) {
    query = query.overlaps('looking_for', options.lookingFor)
  }

  // ELO filters would need a join condition
  // For now, we'll filter after fetching

  const { data, error } = await query
    .limit(options.limit || 50)
    .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1)

  if (error) {
    console.error('Error discovering talent:', error)
    return []
  }

  let results = data || []

  // Apply ELO filters
  if (options.minElo) {
    results = results.filter(p => p.user && p.user.elo_rating >= options.minElo!)
  }
  if (options.maxElo) {
    results = results.filter(p => p.user && p.user.elo_rating <= options.maxElo!)
  }

  // Sort
  if (options.sortBy) {
    results.sort((a, b) => {
      switch (options.sortBy) {
        case 'elo':
          return (b.user?.elo_rating || 0) - (a.user?.elo_rating || 0)
        case 'battles':
          return (b.user?.total_battles || 0) - (a.user?.total_battles || 0)
        case 'wins':
          return (b.user?.wins || 0) - (a.user?.wins || 0)
        case 'recent':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        default:
          return 0
      }
    })
  }

  return results
}

// Send talent inquiry
export async function sendTalentInquiry(
  scoutProfileId: string,
  fromUserId: string | null,
  data: {
    from_email: string
    from_name: string
    from_company?: string
    inquiry_type: TalentInquiry['inquiry_type']
    message: string
  }
): Promise<TalentInquiry | null> {
  const { data: inquiry, error } = await supabase
    .from('talent_inquiries')
    .insert({
      scout_profile_id: scoutProfileId,
      from_user_id: fromUserId,
      ...data,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error sending inquiry:', error)
    return null
  }

  // Notify the talent
  const { data: profile } = await supabase
    .from('scout_profiles')
    .select('user_id')
    .eq('id', scoutProfileId)
    .single()

  if (profile) {
    await supabase.from('notifications').insert({
      user_id: profile.user_id,
      type: 'talent_inquiry',
      title: 'New Talent Inquiry',
      message: `${data.from_name}${data.from_company ? ` from ${data.from_company}` : ''} sent you an inquiry`,
      data: { inquiry_id: inquiry.id }
    })
  }

  return inquiry
}

// Get talent inquiries
export async function getTalentInquiries(userId: string): Promise<TalentInquiry[]> {
  const { data: profile } = await supabase
    .from('scout_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!profile) return []

  const { data, error } = await supabase
    .from('talent_inquiries')
    .select('*')
    .eq('scout_profile_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inquiries:', error)
    return []
  }
  return data || []
}

// Update inquiry status
export async function updateInquiryStatus(
  inquiryId: string,
  status: TalentInquiry['status']
): Promise<boolean> {
  const { error } = await supabase
    .from('talent_inquiries')
    .update({ status })
    .eq('id', inquiryId)

  if (error) {
    console.error('Error updating inquiry:', error)
    return false
  }
  return true
}

// Add scout highlight
export async function addScoutHighlight(
  scoutProfileId: string,
  data: {
    battle_round_id?: string
    title: string
    description?: string
    audio_url?: string
    video_url?: string
  }
): Promise<ScoutHighlight | null> {
  // Get current max order
  const { data: existing } = await supabase
    .from('scout_highlights')
    .select('order')
    .eq('scout_profile_id', scoutProfileId)
    .order('order', { ascending: false })
    .limit(1)

  const maxOrder = existing && existing.length > 0 ? existing[0].order : 0

  const { data: highlight, error } = await supabase
    .from('scout_highlights')
    .insert({
      scout_profile_id: scoutProfileId,
      ...data,
      order: maxOrder + 1
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding highlight:', error)
    return null
  }
  return highlight
}

// Record profile view
export async function recordScoutProfileView(profileId: string, viewerId?: string): Promise<void> {
  await supabase.from('scout_profile_views').insert({
    scout_profile_id: profileId,
    viewer_id: viewerId || null
  })
}

// Get profile view count
export async function getScoutProfileViews(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('scout_profile_views')
    .select('*', { count: 'exact', head: true })
    .eq('scout_profile_id', profileId)

  if (error) return 0
  return count || 0
}
