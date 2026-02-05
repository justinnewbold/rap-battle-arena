import { supabase, Profile, Battle } from './supabase'

// Live Chat with Emotes
export interface ChatEmote {
  id: string
  code: string // e.g., :fire:
  name: string
  image_url: string
  is_premium: boolean
  category: string
  created_at: string
}

export interface LiveChatMessage {
  id: string
  battle_id: string
  user_id: string
  content: string
  emotes_used: string[] // Array of emote codes
  is_highlighted: boolean
  is_pinned: boolean
  created_at: string
  // Joined
  user?: Profile
}

export interface ChatReaction {
  id: string
  message_id: string
  user_id: string
  emote_code: string
  created_at: string
}

// Default emotes
export const DEFAULT_EMOTES: Omit<ChatEmote, 'id' | 'created_at'>[] = [
  { code: ':fire:', name: 'Fire', image_url: '/emotes/fire.png', is_premium: false, category: 'reactions' },
  { code: ':bars:', name: 'Bars', image_url: '/emotes/bars.png', is_premium: false, category: 'reactions' },
  { code: ':mic:', name: 'Microphone', image_url: '/emotes/mic.png', is_premium: false, category: 'reactions' },
  { code: ':clap:', name: 'Clap', image_url: '/emotes/clap.png', is_premium: false, category: 'reactions' },
  { code: ':crown:', name: 'Crown', image_url: '/emotes/crown.png', is_premium: false, category: 'reactions' },
  { code: ':skull:', name: 'Skull', image_url: '/emotes/skull.png', is_premium: false, category: 'reactions' },
  { code: ':100:', name: '100', image_url: '/emotes/100.png', is_premium: false, category: 'reactions' },
  { code: ':goat:', name: 'GOAT', image_url: '/emotes/goat.png', is_premium: false, category: 'reactions' },
  { code: ':diss:', name: 'Diss', image_url: '/emotes/diss.png', is_premium: true, category: 'premium' },
  { code: ':bodybag:', name: 'Body Bag', image_url: '/emotes/bodybag.png', is_premium: true, category: 'premium' },
  { code: ':rip:', name: 'RIP', image_url: '/emotes/rip.png', is_premium: true, category: 'premium' },
  { code: ':legendary:', name: 'Legendary', image_url: '/emotes/legendary.png', is_premium: true, category: 'premium' }
]

// Get all emotes
export async function getEmotes(): Promise<ChatEmote[]> {
  const { data, error } = await supabase
    .from('chat_emotes')
    .select('*')
    .order('category')
    .order('name')

  if (error) {
    console.error('Error fetching emotes:', error)
    return []
  }
  return data || []
}

// Send live chat message
export async function sendLiveChatMessage(
  battleId: string,
  userId: string,
  content: string
): Promise<LiveChatMessage | null> {
  // Parse emotes from content
  const emotePattern = /:[a-z0-9_]+:/g
  const emotesUsed = content.match(emotePattern) || []

  const { data, error } = await supabase
    .from('live_chat_messages')
    .insert({
      battle_id: battleId,
      user_id: userId,
      content: content.slice(0, 500),
      emotes_used: emotesUsed
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

// Get live chat messages
export async function getLiveChatMessages(
  battleId: string,
  limit: number = 100,
  before?: string
): Promise<LiveChatMessage[]> {
  let query = supabase
    .from('live_chat_messages')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .eq('battle_id', battleId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching chat messages:', error)
    return []
  }
  return (data || []).reverse()
}

// Highlight a message (moderator action)
export async function highlightMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('live_chat_messages')
    .update({ is_highlighted: true })
    .eq('id', messageId)

  if (error) {
    console.error('Error highlighting message:', error)
    return false
  }
  return true
}

// Pin a message
export async function pinMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('live_chat_messages')
    .update({ is_pinned: true })
    .eq('id', messageId)

  if (error) {
    console.error('Error pinning message:', error)
    return false
  }
  return true
}

// React to a message
export async function reactToMessage(
  messageId: string,
  userId: string,
  emoteCode: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_reactions')
    .insert({
      message_id: messageId,
      user_id: userId,
      emote_code: emoteCode
    })

  if (error) {
    console.error('Error reacting to message:', error)
    return false
  }
  return true
}

// Follow System
export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  // Joined
  follower?: Profile
  following?: Profile
}

// Follow a user
export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false

  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: followingId
    })

  if (error) {
    console.error('Error following user:', error)
    return false
  }

  // Create notification
  await supabase.from('notifications').insert({
    user_id: followingId,
    type: 'new_follower',
    title: 'New Follower',
    message: 'You have a new follower!',
    data: { follower_id: followerId }
  })

  return true
}

// Unfollow a user
export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) {
    console.error('Error unfollowing user:', error)
    return false
  }
  return true
}

// Check if following
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) return false
  return (count || 0) > 0
}

// Get followers
export async function getFollowers(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower:profiles!follows_follower_id_fkey(*)
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching followers:', error)
    return []
  }
  return (data || []).map(d => d.follower).filter(Boolean) as Profile[]
}

// Get following
export async function getFollowing(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following:profiles!follows_following_id_fkey(*)
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching following:', error)
    return []
  }
  return (data || []).map(d => d.following).filter(Boolean) as Profile[]
}

// Get follower count
export async function getFollowerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)

  if (error) return 0
  return count || 0
}

// Get following count
export async function getFollowingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)

  if (error) return 0
  return count || 0
}

// Get following's recent battles (for feed)
export async function getFollowingRecentBattles(
  userId: string,
  limit: number = 20
): Promise<Battle[]> {
  // Get list of following IDs
  const following = await getFollowing(userId)
  const followingIds = following.map(f => f.id)

  if (followingIds.length === 0) return []

  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(id, username, avatar_url, elo_rating),
      player2:profiles!battles_player2_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .or(`player1_id.in.(${followingIds.join(',')}),player2_id.in.(${followingIds.join(',')})`)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching following battles:', error)
    return []
  }
  return data || []
}

// Battle Predictions
export interface BattlePrediction {
  id: string
  battle_id: string
  user_id: string
  predicted_winner_id: string
  coins_wagered: number
  odds_at_prediction: number
  is_correct: boolean | null
  payout: number | null
  created_at: string
  settled_at: string | null
  // Joined
  battle?: Battle
  user?: Profile
  predicted_winner?: Profile
}

export interface BattleOdds {
  battle_id: string
  player1_id: string
  player2_id: string
  player1_odds: number // e.g., 1.5 means 1.5x payout
  player2_odds: number
  total_pool: number
  player1_pool: number
  player2_pool: number
  updated_at: string
}

// Get battle odds
export async function getBattleOdds(battleId: string): Promise<BattleOdds | null> {
  const { data, error } = await supabase
    .from('battle_odds')
    .select('*')
    .eq('battle_id', battleId)
    .single()

  if (error) {
    return null
  }
  return data
}

// Calculate odds based on pool
function calculateOdds(player1Pool: number, player2Pool: number): { player1Odds: number; player2Odds: number } {
  const totalPool = player1Pool + player2Pool
  if (totalPool === 0) {
    return { player1Odds: 2.0, player2Odds: 2.0 }
  }

  // Take 5% house cut
  const effectivePool = totalPool * 0.95

  const player1Odds = player1Pool > 0 ? effectivePool / player1Pool : 10
  const player2Odds = player2Pool > 0 ? effectivePool / player2Pool : 10

  // Cap odds between 1.1 and 10
  return {
    player1Odds: Math.min(10, Math.max(1.1, player1Odds)),
    player2Odds: Math.min(10, Math.max(1.1, player2Odds))
  }
}

// Place a prediction
export async function placePrediction(
  battleId: string,
  userId: string,
  predictedWinnerId: string,
  coinsWagered: number
): Promise<BattlePrediction | null> {
  // Get current odds
  let odds = await getBattleOdds(battleId)

  // Get battle to verify players
  const { data: battle } = await supabase
    .from('battles')
    .select('player1_id, player2_id, status')
    .eq('id', battleId)
    .single()

  if (!battle || battle.status !== 'ready' && battle.status !== 'battling') {
    console.error('Battle not available for predictions')
    return null
  }

  if (predictedWinnerId !== battle.player1_id && predictedWinnerId !== battle.player2_id) {
    console.error('Invalid predicted winner')
    return null
  }

  // Create or update odds
  const isPlayer1 = predictedWinnerId === battle.player1_id
  const currentOdds = isPlayer1
    ? (odds?.player1_odds || 2.0)
    : (odds?.player2_odds || 2.0)

  if (!odds) {
    // Create odds entry
    const newOdds = {
      battle_id: battleId,
      player1_id: battle.player1_id,
      player2_id: battle.player2_id,
      player1_pool: isPlayer1 ? coinsWagered : 0,
      player2_pool: isPlayer1 ? 0 : coinsWagered,
      total_pool: coinsWagered,
      player1_odds: 2.0,
      player2_odds: 2.0
    }

    await supabase.from('battle_odds').insert(newOdds)
  } else {
    // Update odds
    const newPlayer1Pool = odds.player1_pool + (isPlayer1 ? coinsWagered : 0)
    const newPlayer2Pool = odds.player2_pool + (isPlayer1 ? 0 : coinsWagered)
    const newOdds = calculateOdds(newPlayer1Pool, newPlayer2Pool)

    await supabase
      .from('battle_odds')
      .update({
        player1_pool: newPlayer1Pool,
        player2_pool: newPlayer2Pool,
        total_pool: newPlayer1Pool + newPlayer2Pool,
        player1_odds: newOdds.player1Odds,
        player2_odds: newOdds.player2Odds,
        updated_at: new Date().toISOString()
      })
      .eq('battle_id', battleId)
  }

  // Create prediction
  const { data, error } = await supabase
    .from('battle_predictions')
    .insert({
      battle_id: battleId,
      user_id: userId,
      predicted_winner_id: predictedWinnerId,
      coins_wagered: coinsWagered,
      odds_at_prediction: currentOdds
    })
    .select()
    .single()

  if (error) {
    console.error('Error placing prediction:', error)
    return null
  }
  return data
}

// Get user's predictions
export async function getUserPredictions(
  userId: string,
  status?: 'pending' | 'won' | 'lost'
): Promise<BattlePrediction[]> {
  let query = supabase
    .from('battle_predictions')
    .select(`
      *,
      battle:battles(*,
        player1:profiles!battles_player1_id_fkey(id, username, avatar_url),
        player2:profiles!battles_player2_id_fkey(id, username, avatar_url)
      ),
      predicted_winner:profiles(id, username, avatar_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status === 'pending') {
    query = query.is('is_correct', null)
  } else if (status === 'won') {
    query = query.eq('is_correct', true)
  } else if (status === 'lost') {
    query = query.eq('is_correct', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching predictions:', error)
    return []
  }
  return data || []
}

// Settle predictions after battle
export async function settlePredictions(battleId: string, winnerId: string): Promise<void> {
  // Get all predictions for this battle
  const { data: predictions, error } = await supabase
    .from('battle_predictions')
    .select('*')
    .eq('battle_id', battleId)
    .is('is_correct', null)

  if (error || !predictions) return

  for (const prediction of predictions) {
    const isCorrect = prediction.predicted_winner_id === winnerId
    const payout = isCorrect
      ? Math.floor(prediction.coins_wagered * prediction.odds_at_prediction)
      : 0

    await supabase
      .from('battle_predictions')
      .update({
        is_correct: isCorrect,
        payout,
        settled_at: new Date().toISOString()
      })
      .eq('id', prediction.id)

    // Award coins if won
    if (isCorrect && payout > 0) {
      await supabase.rpc('add_coins_to_wallet', {
        p_user_id: prediction.user_id,
        p_amount: payout
      })
    }
  }
}

// Battle Commentary / Analysis Threads
export interface CommentaryThread {
  id: string
  battle_id: string
  author_id: string
  title: string
  content: string
  thread_type: 'analysis' | 'breakdown' | 'highlight' | 'discussion'
  upvotes: number
  downvotes: number
  is_pinned: boolean
  created_at: string
  updated_at: string
  // Joined
  author?: Profile
  battle?: Battle
  comments?: ThreadComment[]
}

export interface ThreadComment {
  id: string
  thread_id: string
  author_id: string
  content: string
  parent_comment_id: string | null
  upvotes: number
  downvotes: number
  created_at: string
  // Joined
  author?: Profile
  replies?: ThreadComment[]
}

// Create a commentary thread
export async function createCommentaryThread(
  battleId: string,
  authorId: string,
  title: string,
  content: string,
  threadType: CommentaryThread['thread_type']
): Promise<CommentaryThread | null> {
  const { data, error } = await supabase
    .from('commentary_threads')
    .insert({
      battle_id: battleId,
      author_id: authorId,
      title,
      content,
      thread_type: threadType
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating thread:', error)
    return null
  }
  return data
}

// Get threads for a battle
export async function getBattleThreads(battleId: string): Promise<CommentaryThread[]> {
  const { data, error } = await supabase
    .from('commentary_threads')
    .select(`
      *,
      author:profiles(id, username, avatar_url)
    `)
    .eq('battle_id', battleId)
    .order('is_pinned', { ascending: false })
    .order('upvotes', { ascending: false })

  if (error) {
    console.error('Error fetching threads:', error)
    return []
  }
  return data || []
}

// Get a single thread with comments
export async function getThread(threadId: string): Promise<CommentaryThread | null> {
  const { data, error } = await supabase
    .from('commentary_threads')
    .select(`
      *,
      author:profiles(id, username, avatar_url),
      battle:battles(*,
        player1:profiles!battles_player1_id_fkey(id, username, avatar_url),
        player2:profiles!battles_player2_id_fkey(id, username, avatar_url)
      )
    `)
    .eq('id', threadId)
    .single()

  if (error) {
    console.error('Error fetching thread:', error)
    return null
  }
  return data
}

// Get thread comments
export async function getThreadComments(threadId: string): Promise<ThreadComment[]> {
  const { data, error } = await supabase
    .from('thread_comments')
    .select(`
      *,
      author:profiles(id, username, avatar_url)
    `)
    .eq('thread_id', threadId)
    .is('parent_comment_id', null)
    .order('upvotes', { ascending: false })

  if (error) {
    console.error('Error fetching comments:', error)
    return []
  }

  // Get replies for each comment
  for (const comment of data || []) {
    const { data: replies } = await supabase
      .from('thread_comments')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .eq('parent_comment_id', comment.id)
      .order('created_at', { ascending: true })

    comment.replies = replies || []
  }

  return data || []
}

// Add a comment
export async function addThreadComment(
  threadId: string,
  authorId: string,
  content: string,
  parentCommentId?: string
): Promise<ThreadComment | null> {
  const { data, error } = await supabase
    .from('thread_comments')
    .insert({
      thread_id: threadId,
      author_id: authorId,
      content,
      parent_comment_id: parentCommentId || null
    })
    .select(`
      *,
      author:profiles(id, username, avatar_url)
    `)
    .single()

  if (error) {
    console.error('Error adding comment:', error)
    return null
  }
  return data
}

// Vote on thread
export async function voteOnThread(
  threadId: string,
  userId: string,
  vote: 'up' | 'down'
): Promise<boolean> {
  // Check existing vote
  const { data: existing } = await supabase
    .from('thread_votes')
    .select('*')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    if (existing.vote === vote) {
      // Remove vote
      await supabase
        .from('thread_votes')
        .delete()
        .eq('id', existing.id)

      // Update counts
      await supabase.rpc(vote === 'up' ? 'decrement_thread_upvotes' : 'decrement_thread_downvotes', {
        p_thread_id: threadId
      })
    } else {
      // Change vote
      await supabase
        .from('thread_votes')
        .update({ vote })
        .eq('id', existing.id)

      // Update counts
      if (vote === 'up') {
        await supabase.rpc('increment_thread_upvotes', { p_thread_id: threadId })
        await supabase.rpc('decrement_thread_downvotes', { p_thread_id: threadId })
      } else {
        await supabase.rpc('decrement_thread_upvotes', { p_thread_id: threadId })
        await supabase.rpc('increment_thread_downvotes', { p_thread_id: threadId })
      }
    }
  } else {
    // New vote
    await supabase
      .from('thread_votes')
      .insert({
        thread_id: threadId,
        user_id: userId,
        vote
      })

    await supabase.rpc(vote === 'up' ? 'increment_thread_upvotes' : 'increment_thread_downvotes', {
      p_thread_id: threadId
    })
  }

  return true
}

// Get trending threads
export async function getTrendingThreads(limit: number = 10): Promise<CommentaryThread[]> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('commentary_threads')
    .select(`
      *,
      author:profiles(id, username, avatar_url),
      battle:battles(room_code, status)
    `)
    .gte('created_at', weekAgo.toISOString())
    .order('upvotes', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching trending threads:', error)
    return []
  }
  return data || []
}

// Get user's threads
export async function getUserThreads(userId: string): Promise<CommentaryThread[]> {
  const { data, error } = await supabase
    .from('commentary_threads')
    .select(`
      *,
      battle:battles(room_code, status)
    `)
    .eq('author_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user threads:', error)
    return []
  }
  return data || []
}

// Activity Feed Types
export type ActivityType =
  | 'battle_completed'
  | 'achievement_unlocked'
  | 'followed_you'
  | 'joined_crew'
  | 'tournament_win'
  | 'new_mixtape'
  | 'highlight_created'

export interface ActivityItem {
  id: string
  user_id: string
  activity_type: ActivityType
  title: string
  description: string
  data: Record<string, any>
  is_public: boolean
  created_at: string
  // Joined
  user?: Profile
}

// Get activity feed for followed users
export async function getActivityFeed(userId: string, limit: number = 50): Promise<ActivityItem[]> {
  const following = await getFollowing(userId)
  const followingIds = following.map(f => f.id)

  if (followingIds.length === 0) return []

  const { data, error } = await supabase
    .from('activity_feed')
    .select(`
      *,
      user:profiles(id, username, avatar_url)
    `)
    .in('user_id', followingIds)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching activity feed:', error)
    return []
  }
  return data || []
}

// Log activity
export async function logActivity(
  userId: string,
  activityType: ActivityType,
  title: string,
  description: string,
  data: Record<string, any> = {},
  isPublic: boolean = true
): Promise<void> {
  await supabase
    .from('activity_feed')
    .insert({
      user_id: userId,
      activity_type: activityType,
      title,
      description,
      data,
      is_public: isPublic
    })
}
