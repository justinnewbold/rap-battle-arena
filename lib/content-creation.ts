import { supabase, Profile, Beat, UserBeat } from './supabase'

// Beat Marketplace Types
export type ListingStatus = 'active' | 'sold' | 'expired' | 'removed'
export type LicenseType = 'basic' | 'premium' | 'exclusive'

export interface BeatListing {
  id: string
  beat_id: string
  seller_id: string
  title: string
  description: string
  price_coins: number
  price_usd: number | null
  license_type: LicenseType
  tags: string[]
  genre: string
  plays: number
  purchases: number
  status: ListingStatus
  featured: boolean
  created_at: string
  expires_at: string | null
  // Joined
  beat?: UserBeat
  seller?: Profile
}

export interface BeatPurchase {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  price_coins: number
  price_usd: number | null
  license_type: LicenseType
  transaction_id: string | null
  created_at: string
  // Joined
  listing?: BeatListing
  buyer?: Profile
  seller?: Profile
}

export interface BeatReview {
  id: string
  listing_id: string
  reviewer_id: string
  rating: number // 1-5
  review_text: string | null
  created_at: string
  // Joined
  reviewer?: Profile
}

// License type descriptions
export const LICENSE_TYPES: Record<LicenseType, { name: string; description: string; rights: string[] }> = {
  basic: {
    name: 'Basic License',
    description: 'Use the beat for non-commercial purposes',
    rights: [
      'Use in rap battles on this platform',
      'Use in practice sessions',
      'Share clips on social media',
      'Non-exclusive rights'
    ]
  },
  premium: {
    name: 'Premium License',
    description: 'Use the beat for commercial projects',
    rights: [
      'All Basic License rights',
      'Use in commercial releases',
      'Streaming platforms (up to 100k streams)',
      'Music videos',
      'Non-exclusive rights'
    ]
  },
  exclusive: {
    name: 'Exclusive License',
    description: 'Full ownership of the beat',
    rights: [
      'All Premium License rights',
      'Unlimited streams',
      'Beat removed from marketplace',
      'Full ownership transfer',
      'Exclusive rights'
    ]
  }
}

// Get marketplace listings
export async function getMarketplaceListings(
  options: {
    genre?: string
    minPrice?: number
    maxPrice?: number
    sortBy?: 'price' | 'plays' | 'purchases' | 'created_at'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    offset?: number
  } = {}
): Promise<{ listings: BeatListing[]; total: number }> {
  let query = supabase
    .from('beat_listings')
    .select(`
      *,
      beat:beats(*),
      seller:profiles(id, username, avatar_url)
    `, { count: 'exact' })
    .eq('status', 'active')

  if (options.genre) {
    query = query.eq('genre', options.genre)
  }
  if (options.minPrice !== undefined) {
    query = query.gte('price_coins', options.minPrice)
  }
  if (options.maxPrice !== undefined) {
    query = query.lte('price_coins', options.maxPrice)
  }

  const sortBy = options.sortBy || 'created_at'
  const sortOrder = options.sortOrder || 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching listings:', error)
    return { listings: [], total: 0 }
  }
  return { listings: data || [], total: count || 0 }
}

// Get featured listings
export async function getFeaturedListings(limit: number = 10): Promise<BeatListing[]> {
  const { data, error } = await supabase
    .from('beat_listings')
    .select(`
      *,
      beat:beats(*),
      seller:profiles(id, username, avatar_url)
    `)
    .eq('status', 'active')
    .eq('featured', true)
    .order('purchases', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching featured listings:', error)
    return []
  }
  return data || []
}

// Create a listing
export async function createListing(
  beatId: string,
  sellerId: string,
  title: string,
  description: string,
  priceCoins: number,
  licenseType: LicenseType,
  genre: string,
  tags: string[] = [],
  priceUsd?: number,
  expiresAt?: string
): Promise<BeatListing | null> {
  const { data, error } = await supabase
    .from('beat_listings')
    .insert({
      beat_id: beatId,
      seller_id: sellerId,
      title,
      description,
      price_coins: priceCoins,
      price_usd: priceUsd || null,
      license_type: licenseType,
      genre,
      tags,
      status: 'active',
      expires_at: expiresAt || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating listing:', error)
    return null
  }
  return data
}

// Purchase a beat
export async function purchaseBeat(
  listingId: string,
  buyerId: string
): Promise<BeatPurchase | null> {
  // Get listing details
  const { data: listing, error: listingError } = await supabase
    .from('beat_listings')
    .select('*')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()

  if (listingError || !listing) {
    console.error('Listing not found or not active')
    return null
  }

  // Check buyer isn't seller
  if (listing.seller_id === buyerId) {
    console.error('Cannot purchase own beat')
    return null
  }

  // Create purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from('beat_purchases')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: listing.seller_id,
      price_coins: listing.price_coins,
      price_usd: listing.price_usd,
      license_type: listing.license_type
    })
    .select()
    .single()

  if (purchaseError) {
    console.error('Error creating purchase:', purchaseError)
    return null
  }

  // Update listing stats
  await supabase
    .from('beat_listings')
    .update({
      purchases: listing.purchases + 1,
      status: listing.license_type === 'exclusive' ? 'sold' : 'active'
    })
    .eq('id', listingId)

  // Grant beat to buyer
  await supabase
    .from('user_beat_library')
    .insert({
      user_id: buyerId,
      beat_id: listing.beat_id,
      license_type: listing.license_type
    })

  return purchase
}

// Get user's purchased beats
export async function getUserPurchasedBeats(userId: string): Promise<BeatPurchase[]> {
  const { data, error } = await supabase
    .from('beat_purchases')
    .select(`
      *,
      listing:beat_listings(*, beat:beats(*))
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching purchases:', error)
    return []
  }
  return data || []
}

// Get seller's sales
export async function getSellerSales(sellerId: string): Promise<BeatPurchase[]> {
  const { data, error } = await supabase
    .from('beat_purchases')
    .select(`
      *,
      listing:beat_listings(*),
      buyer:profiles(id, username, avatar_url)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sales:', error)
    return []
  }
  return data || []
}

// Leave a review
export async function leaveReview(
  listingId: string,
  reviewerId: string,
  rating: number,
  reviewText?: string
): Promise<BeatReview | null> {
  // Check reviewer purchased the beat
  const { count } = await supabase
    .from('beat_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('buyer_id', reviewerId)

  if (!count || count === 0) {
    console.error('Must purchase beat to review')
    return null
  }

  const { data, error } = await supabase
    .from('beat_reviews')
    .insert({
      listing_id: listingId,
      reviewer_id: reviewerId,
      rating: Math.min(5, Math.max(1, rating)),
      review_text: reviewText || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating review:', error)
    return null
  }
  return data
}

// Get listing reviews
export async function getListingReviews(listingId: string): Promise<BeatReview[]> {
  const { data, error } = await supabase
    .from('beat_reviews')
    .select(`
      *,
      reviewer:profiles(id, username, avatar_url)
    `)
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reviews:', error)
    return []
  }
  return data || []
}

// 2v2 Collaborative Battles
export type TeamBattleStatus = 'forming' | 'ready' | 'in_progress' | 'complete' | 'cancelled'

export interface TeamBattle {
  id: string
  room_code: string
  status: TeamBattleStatus
  team1_player1_id: string
  team1_player2_id: string | null
  team2_player1_id: string | null
  team2_player2_id: string | null
  winner_team: 1 | 2 | null
  team1_total_score: number
  team2_total_score: number
  current_round: number
  total_rounds: number
  beat_id: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  // Joined
  team1_player1?: Profile
  team1_player2?: Profile
  team2_player1?: Profile
  team2_player2?: Profile
  beat?: Beat
}

export interface TeamBattleRound {
  id: string
  battle_id: string
  round_number: number
  team: 1 | 2
  player_id: string
  audio_url: string | null
  transcript: string | null
  score: number | null
  feedback: string | null
  created_at: string
  // Joined
  player?: Profile
}

// Create a 2v2 battle
export async function createTeamBattle(
  creatorId: string,
  roomCode: string,
  totalRounds: number = 4, // 4 rounds (each player goes once)
  beatId?: string
): Promise<TeamBattle | null> {
  const { data, error } = await supabase
    .from('team_battles')
    .insert({
      room_code: roomCode,
      team1_player1_id: creatorId,
      status: 'forming',
      total_rounds: totalRounds,
      beat_id: beatId || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating team battle:', error)
    return null
  }
  return data
}

// Join a team battle
export async function joinTeamBattle(
  battleId: string,
  userId: string,
  preferredTeam?: 1 | 2
): Promise<TeamBattle | null> {
  const { data: battle, error: fetchError } = await supabase
    .from('team_battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (fetchError || !battle) {
    console.error('Battle not found')
    return null
  }

  // Determine which slot to fill
  let slot: string | null = null

  if (preferredTeam === 1 || !preferredTeam) {
    if (!battle.team1_player2_id) slot = 'team1_player2_id'
  }
  if (!slot && (preferredTeam === 2 || !preferredTeam)) {
    if (!battle.team2_player1_id) slot = 'team2_player1_id'
    else if (!battle.team2_player2_id) slot = 'team2_player2_id'
  }
  if (!slot && !battle.team1_player2_id) slot = 'team1_player2_id'

  if (!slot) {
    console.error('Battle is full')
    return null
  }

  // Check if all slots will be filled
  const currentPlayers = [
    battle.team1_player1_id,
    battle.team1_player2_id,
    battle.team2_player1_id,
    battle.team2_player2_id
  ].filter(Boolean).length

  const newStatus = currentPlayers === 3 ? 'ready' : 'forming'

  const { data, error } = await supabase
    .from('team_battles')
    .update({
      [slot]: userId,
      status: newStatus
    })
    .eq('id', battleId)
    .select()
    .single()

  if (error) {
    console.error('Error joining team battle:', error)
    return null
  }
  return data
}

// Get team battle by code
export async function getTeamBattleByCode(roomCode: string): Promise<TeamBattle | null> {
  const { data, error } = await supabase
    .from('team_battles')
    .select(`
      *,
      team1_player1:profiles!team_battles_team1_player1_id_fkey(id, username, avatar_url, elo_rating),
      team1_player2:profiles!team_battles_team1_player2_id_fkey(id, username, avatar_url, elo_rating),
      team2_player1:profiles!team_battles_team2_player1_id_fkey(id, username, avatar_url, elo_rating),
      team2_player2:profiles!team_battles_team2_player2_id_fkey(id, username, avatar_url, elo_rating),
      beat:beats(*)
    `)
    .eq('room_code', roomCode.toUpperCase())
    .single()

  if (error) {
    console.error('Error fetching team battle:', error)
    return null
  }
  return data
}

// Written Battles (Text-only format)
export type WrittenBattleStatus = 'active' | 'voting' | 'complete'

export interface WrittenBattle {
  id: string
  creator_id: string
  opponent_id: string | null
  status: WrittenBattleStatus
  title: string
  topic: string | null
  max_bars: number
  current_round: number
  total_rounds: number
  voting_ends_at: string | null
  winner_id: string | null
  creator_total_votes: number
  opponent_total_votes: number
  is_public: boolean
  created_at: string
  completed_at: string | null
  // Joined
  creator?: Profile
  opponent?: Profile
  rounds?: WrittenBattleRound[]
}

export interface WrittenBattleRound {
  id: string
  battle_id: string
  round_number: number
  player_id: string
  content: string
  submitted_at: string
  ai_score: number | null
  ai_feedback: string | null
  votes: number
  // Joined
  player?: Profile
}

export interface WrittenBattleVote {
  id: string
  battle_id: string
  round_number: number | null // null = overall
  voter_id: string
  voted_for_id: string
  created_at: string
}

// Create a written battle
export async function createWrittenBattle(
  creatorId: string,
  title: string,
  maxBars: number = 16,
  totalRounds: number = 2,
  topic?: string,
  isPublic: boolean = true
): Promise<WrittenBattle | null> {
  const { data, error } = await supabase
    .from('written_battles')
    .insert({
      creator_id: creatorId,
      title,
      topic: topic || null,
      max_bars: maxBars,
      total_rounds: totalRounds,
      is_public: isPublic,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating written battle:', error)
    return null
  }
  return data
}

// Join a written battle
export async function joinWrittenBattle(battleId: string, userId: string): Promise<WrittenBattle | null> {
  const { data, error } = await supabase
    .from('written_battles')
    .update({ opponent_id: userId })
    .eq('id', battleId)
    .is('opponent_id', null)
    .select()
    .single()

  if (error) {
    console.error('Error joining written battle:', error)
    return null
  }
  return data
}

// Submit a round in written battle
export async function submitWrittenRound(
  battleId: string,
  roundNumber: number,
  playerId: string,
  content: string
): Promise<WrittenBattleRound | null> {
  const { data, error } = await supabase
    .from('written_battle_rounds')
    .insert({
      battle_id: battleId,
      round_number: roundNumber,
      player_id: playerId,
      content,
      submitted_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting round:', error)
    return null
  }
  return data
}

// Get open written battles
export async function getOpenWrittenBattles(limit: number = 20): Promise<WrittenBattle[]> {
  const { data, error } = await supabase
    .from('written_battles')
    .select(`
      *,
      creator:profiles!written_battles_creator_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .is('opponent_id', null)
    .eq('status', 'active')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching open battles:', error)
    return []
  }
  return data || []
}

// Vote in written battle
export async function voteInWrittenBattle(
  battleId: string,
  voterId: string,
  votedForId: string,
  roundNumber?: number
): Promise<boolean> {
  const { error } = await supabase
    .from('written_battle_votes')
    .insert({
      battle_id: battleId,
      voter_id: voterId,
      voted_for_id: votedForId,
      round_number: roundNumber || null
    })

  if (error) {
    console.error('Error voting:', error)
    return false
  }
  return true
}

// Battle Mixtapes
export interface Mixtape {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  plays: number
  likes: number
  created_at: string
  updated_at: string
  // Joined
  user?: Profile
  tracks?: MixtapeTrack[]
}

export interface MixtapeTrack {
  id: string
  mixtape_id: string
  battle_round_id: string
  track_number: number
  custom_title: string | null
  created_at: string
  // Joined
  battle_round?: {
    id: string
    battle_id: string
    audio_url: string | null
    transcript: string | null
    total_score: number | null
  }
}

// Create a mixtape
export async function createMixtape(
  userId: string,
  title: string,
  description?: string,
  coverUrl?: string,
  isPublic: boolean = true
): Promise<Mixtape | null> {
  const { data, error } = await supabase
    .from('mixtapes')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      cover_url: coverUrl || null,
      is_public: isPublic
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating mixtape:', error)
    return null
  }
  return data
}

// Add track to mixtape
export async function addTrackToMixtape(
  mixtapeId: string,
  battleRoundId: string,
  trackNumber: number,
  customTitle?: string
): Promise<MixtapeTrack | null> {
  const { data, error } = await supabase
    .from('mixtape_tracks')
    .insert({
      mixtape_id: mixtapeId,
      battle_round_id: battleRoundId,
      track_number: trackNumber,
      custom_title: customTitle || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding track:', error)
    return null
  }
  return data
}

// Remove track from mixtape
export async function removeTrackFromMixtape(trackId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mixtape_tracks')
    .delete()
    .eq('id', trackId)

  if (error) {
    console.error('Error removing track:', error)
    return false
  }
  return true
}

// Reorder mixtape tracks
export async function reorderMixtapeTracks(
  mixtapeId: string,
  trackOrder: { trackId: string; trackNumber: number }[]
): Promise<boolean> {
  for (const item of trackOrder) {
    const { error } = await supabase
      .from('mixtape_tracks')
      .update({ track_number: item.trackNumber })
      .eq('id', item.trackId)
      .eq('mixtape_id', mixtapeId)

    if (error) {
      console.error('Error reordering tracks:', error)
      return false
    }
  }
  return true
}

// Get user's mixtapes
export async function getUserMixtapes(userId: string): Promise<Mixtape[]> {
  const { data, error } = await supabase
    .from('mixtapes')
    .select(`
      *,
      tracks:mixtape_tracks(
        *,
        battle_round:battle_rounds(id, battle_id, audio_url, transcript, total_score)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching mixtapes:', error)
    return []
  }
  return data || []
}

// Get public mixtapes
export async function getPublicMixtapes(
  sortBy: 'plays' | 'likes' | 'created_at' = 'plays',
  limit: number = 20
): Promise<Mixtape[]> {
  const { data, error } = await supabase
    .from('mixtapes')
    .select(`
      *,
      user:profiles(id, username, avatar_url),
      tracks:mixtape_tracks(count)
    `)
    .eq('is_public', true)
    .order(sortBy, { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching public mixtapes:', error)
    return []
  }
  return data || []
}

// Get mixtape by ID
export async function getMixtape(mixtapeId: string): Promise<Mixtape | null> {
  const { data, error } = await supabase
    .from('mixtapes')
    .select(`
      *,
      user:profiles(id, username, avatar_url),
      tracks:mixtape_tracks(
        *,
        battle_round:battle_rounds(id, battle_id, audio_url, transcript, total_score)
      )
    `)
    .eq('id', mixtapeId)
    .single()

  if (error) {
    console.error('Error fetching mixtape:', error)
    return null
  }
  return data
}

// Increment mixtape plays
export async function incrementMixtapePlays(mixtapeId: string): Promise<void> {
  await supabase.rpc('increment_mixtape_plays', { p_mixtape_id: mixtapeId })
}

// Like mixtape
export async function likeMixtape(mixtapeId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mixtape_likes')
    .insert({ mixtape_id: mixtapeId, user_id: userId })

  if (error) {
    console.error('Error liking mixtape:', error)
    return false
  }

  await supabase.rpc('increment_mixtape_likes', { p_mixtape_id: mixtapeId })
  return true
}

// Unlike mixtape
export async function unlikeMixtape(mixtapeId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mixtape_likes')
    .delete()
    .eq('mixtape_id', mixtapeId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error unliking mixtape:', error)
    return false
  }

  await supabase.rpc('decrement_mixtape_likes', { p_mixtape_id: mixtapeId })
  return true
}

// Get user's eligible rounds for mixtape
export async function getUserMixtapeEligibleRounds(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('battle_rounds')
    .select(`
      id,
      battle_id,
      round_number,
      audio_url,
      transcript,
      total_score,
      created_at,
      battle:battles(room_code, status, completed_at)
    `)
    .eq('player_id', userId)
    .not('audio_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching eligible rounds:', error)
    return []
  }
  return data || []
}

// Generate shareable mixtape link
export function generateMixtapeShareUrl(mixtapeId: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || ''}/mixtapes/${mixtapeId}`
}

// Export mixtape as playlist (for external platforms)
export async function exportMixtapePlaylist(mixtapeId: string): Promise<{
  title: string
  tracks: Array<{
    title: string
    duration: number
    audioUrl: string
  }>
} | null> {
  const mixtape = await getMixtape(mixtapeId)
  if (!mixtape) return null

  return {
    title: mixtape.title,
    tracks: (mixtape.tracks || [])
      .sort((a, b) => a.track_number - b.track_number)
      .map((track, index) => ({
        title: track.custom_title || `Track ${index + 1}`,
        duration: 60, // Would calculate from audio
        audioUrl: track.battle_round?.audio_url || ''
      }))
      .filter(t => t.audioUrl)
  }
}
