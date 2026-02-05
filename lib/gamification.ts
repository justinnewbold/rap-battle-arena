import { supabase, Profile } from './supabase'

// Battle Coins - Virtual Currency
export interface UserWallet {
  id: string
  user_id: string
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  created_at: string
  updated_at: string
}

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  transaction_type: 'earn' | 'spend' | 'gift' | 'refund'
  source: string // e.g., 'battle_win', 'daily_challenge', 'purchase'
  description: string
  reference_id: string | null // Related item ID
  created_at: string
}

// Get user's wallet
export async function getUserWallet(userId: string): Promise<UserWallet | null> {
  const { data, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // Create wallet if doesn't exist
    if (error.code === 'PGRST116') {
      return createUserWallet(userId)
    }
    console.error('Error fetching wallet:', error)
    return null
  }
  return data
}

// Create user wallet
async function createUserWallet(userId: string): Promise<UserWallet | null> {
  const { data, error } = await supabase
    .from('user_wallets')
    .insert({
      user_id: userId,
      balance: 100, // Starting bonus
      lifetime_earned: 100,
      lifetime_spent: 0
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating wallet:', error)
    return null
  }
  return data
}

// Add coins to wallet
export async function addCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  referenceId?: string
): Promise<boolean> {
  // Start transaction
  const { error: txError } = await supabase
    .from('coin_transactions')
    .insert({
      user_id: userId,
      amount,
      transaction_type: 'earn',
      source,
      description,
      reference_id: referenceId || null
    })

  if (txError) {
    console.error('Error recording transaction:', txError)
    return false
  }

  // Update wallet
  const { error } = await supabase.rpc('add_coins_to_wallet', {
    p_user_id: userId,
    p_amount: amount
  })

  if (error) {
    console.error('Error adding coins:', error)
    return false
  }
  return true
}

// Spend coins
export async function spendCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  referenceId?: string
): Promise<boolean> {
  // Check balance first
  const wallet = await getUserWallet(userId)
  if (!wallet || wallet.balance < amount) {
    return false
  }

  // Record transaction
  const { error: txError } = await supabase
    .from('coin_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      transaction_type: 'spend',
      source,
      description,
      reference_id: referenceId || null
    })

  if (txError) {
    console.error('Error recording transaction:', txError)
    return false
  }

  // Update wallet
  const { error } = await supabase.rpc('spend_coins_from_wallet', {
    p_user_id: userId,
    p_amount: amount
  })

  if (error) {
    console.error('Error spending coins:', error)
    return false
  }
  return true
}

// Get transaction history
export async function getTransactionHistory(userId: string, limit: number = 50): Promise<CoinTransaction[]> {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }
  return data || []
}

// Coin rewards configuration
export const COIN_REWARDS = {
  BATTLE_WIN: 50,
  BATTLE_LOSS: 10,
  DAILY_LOGIN: 10,
  DAILY_CHALLENGE: 25,
  WEEKLY_CHALLENGE: 100,
  ACHIEVEMENT_COMMON: 25,
  ACHIEVEMENT_RARE: 50,
  ACHIEVEMENT_EPIC: 100,
  ACHIEVEMENT_LEGENDARY: 250,
  TOURNAMENT_WIN: 500,
  TOURNAMENT_FINALS: 200,
  TOURNAMENT_PARTICIPATION: 50,
  REFERRAL_BONUS: 100,
  FIRST_BATTLE: 50,
  WIN_STREAK_5: 75,
  WIN_STREAK_10: 150
}

// Daily/Weekly Challenges
export type ChallengeType = 'daily' | 'weekly'
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

export interface Challenge {
  id: string
  type: ChallengeType
  title: string
  description: string
  difficulty: ChallengeDifficulty
  requirement_type: string // e.g., 'win_battles', 'complete_battles', 'earn_votes'
  requirement_value: number
  coin_reward: number
  xp_reward: number
  starts_at: string
  ends_at: string
  is_active: boolean
  created_at: string
}

export interface UserChallengeProgress {
  id: string
  user_id: string
  challenge_id: string
  progress: number
  completed: boolean
  claimed: boolean
  completed_at: string | null
  created_at: string
  // Joined
  challenge?: Challenge
}

// Get active challenges
export async function getActiveChallenges(type?: ChallengeType): Promise<Challenge[]> {
  const now = new Date().toISOString()

  let query = supabase
    .from('challenges')
    .select('*')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .eq('is_active', true)
    .order('difficulty', { ascending: true })

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching challenges:', error)
    return []
  }
  return data || []
}

// Get user's challenge progress
export async function getUserChallengeProgress(userId: string): Promise<UserChallengeProgress[]> {
  const { data, error } = await supabase
    .from('user_challenge_progress')
    .select(`
      *,
      challenge:challenges(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching challenge progress:', error)
    return []
  }
  return data || []
}

// Update challenge progress
export async function updateChallengeProgress(
  userId: string,
  challengeId: string,
  progressIncrement: number
): Promise<UserChallengeProgress | null> {
  // Get or create progress entry
  const { data: existing } = await supabase
    .from('user_challenge_progress')
    .select('*, challenge:challenges(*)')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .single()

  if (existing) {
    const newProgress = existing.progress + progressIncrement
    const completed = existing.challenge && newProgress >= existing.challenge.requirement_value

    const { data, error } = await supabase
      .from('user_challenge_progress')
      .update({
        progress: newProgress,
        completed,
        completed_at: completed && !existing.completed ? new Date().toISOString() : existing.completed_at
      })
      .eq('id', existing.id)
      .select('*, challenge:challenges(*)')
      .single()

    if (error) {
      console.error('Error updating progress:', error)
      return null
    }
    return data
  }

  // Create new progress entry
  const { data, error } = await supabase
    .from('user_challenge_progress')
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      progress: progressIncrement
    })
    .select('*, challenge:challenges(*)')
    .single()

  if (error) {
    console.error('Error creating progress:', error)
    return null
  }
  return data
}

// Claim challenge reward
export async function claimChallengeReward(userId: string, progressId: string): Promise<boolean> {
  const { data: progress, error: fetchError } = await supabase
    .from('user_challenge_progress')
    .select('*, challenge:challenges(*)')
    .eq('id', progressId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !progress || !progress.completed || progress.claimed) {
    return false
  }

  // Mark as claimed
  const { error: updateError } = await supabase
    .from('user_challenge_progress')
    .update({ claimed: true })
    .eq('id', progressId)

  if (updateError) {
    return false
  }

  // Award coins
  if (progress.challenge) {
    await addCoins(
      userId,
      progress.challenge.coin_reward,
      'challenge',
      `Completed: ${progress.challenge.title}`,
      progress.challenge.id
    )
  }

  return true
}

// Season Pass Types
export type SeasonTier = 'free' | 'premium'

export interface Season {
  id: string
  name: string
  description: string
  number: number
  starts_at: string
  ends_at: string
  is_active: boolean
  premium_price: number // in coins or real currency
  created_at: string
}

export interface SeasonReward {
  id: string
  season_id: string
  level: number
  tier: SeasonTier
  reward_type: 'coins' | 'avatar' | 'title' | 'beat' | 'emote' | 'theme'
  reward_value: string // JSON or ID
  reward_name: string
  reward_description: string
  reward_image_url: string | null
}

export interface UserSeasonProgress {
  id: string
  user_id: string
  season_id: string
  xp: number
  level: number
  has_premium: boolean
  claimed_rewards: string[] // Array of reward IDs
  created_at: string
  updated_at: string
}

// XP per level configuration
export const XP_PER_LEVEL = 1000
export const MAX_SEASON_LEVEL = 100

// Get current season
export async function getCurrentSeason(): Promise<Season | null> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('seasons')
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

// Get season rewards
export async function getSeasonRewards(seasonId: string): Promise<SeasonReward[]> {
  const { data, error } = await supabase
    .from('season_rewards')
    .select('*')
    .eq('season_id', seasonId)
    .order('level', { ascending: true })
    .order('tier', { ascending: true })

  if (error) {
    console.error('Error fetching season rewards:', error)
    return []
  }
  return data || []
}

// Get user's season progress
export async function getUserSeasonProgress(userId: string, seasonId: string): Promise<UserSeasonProgress | null> {
  const { data, error } = await supabase
    .from('user_season_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('season_id', seasonId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return createUserSeasonProgress(userId, seasonId)
    }
    return null
  }
  return data
}

// Create user season progress
async function createUserSeasonProgress(userId: string, seasonId: string): Promise<UserSeasonProgress | null> {
  const { data, error } = await supabase
    .from('user_season_progress')
    .insert({
      user_id: userId,
      season_id: seasonId,
      xp: 0,
      level: 1,
      has_premium: false,
      claimed_rewards: []
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating season progress:', error)
    return null
  }
  return data
}

// Add XP to season progress
export async function addSeasonXP(userId: string, seasonId: string, xpAmount: number): Promise<UserSeasonProgress | null> {
  const progress = await getUserSeasonProgress(userId, seasonId)
  if (!progress) return null

  const newXP = progress.xp + xpAmount
  const newLevel = Math.min(Math.floor(newXP / XP_PER_LEVEL) + 1, MAX_SEASON_LEVEL)

  const { data, error } = await supabase
    .from('user_season_progress')
    .update({
      xp: newXP,
      level: newLevel,
      updated_at: new Date().toISOString()
    })
    .eq('id', progress.id)
    .select()
    .single()

  if (error) {
    console.error('Error adding XP:', error)
    return null
  }
  return data
}

// Upgrade to premium season pass
export async function upgradeToPremiumPass(userId: string, seasonId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_season_progress')
    .update({
      has_premium: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('season_id', seasonId)

  if (error) {
    console.error('Error upgrading to premium:', error)
    return false
  }
  return true
}

// Claim season reward
export async function claimSeasonReward(
  userId: string,
  seasonId: string,
  rewardId: string
): Promise<boolean> {
  const progress = await getUserSeasonProgress(userId, seasonId)
  if (!progress) return false

  // Get reward details
  const { data: reward, error: rewardError } = await supabase
    .from('season_rewards')
    .select('*')
    .eq('id', rewardId)
    .single()

  if (rewardError || !reward) return false

  // Check eligibility
  if (progress.level < reward.level) return false
  if (reward.tier === 'premium' && !progress.has_premium) return false
  if (progress.claimed_rewards.includes(rewardId)) return false

  // Update claimed rewards
  const newClaimedRewards = [...progress.claimed_rewards, rewardId]

  const { error } = await supabase
    .from('user_season_progress')
    .update({
      claimed_rewards: newClaimedRewards,
      updated_at: new Date().toISOString()
    })
    .eq('id', progress.id)

  if (error) {
    console.error('Error claiming reward:', error)
    return false
  }

  // Grant reward based on type
  if (reward.reward_type === 'coins') {
    await addCoins(userId, parseInt(reward.reward_value), 'season_reward', reward.reward_name, rewardId)
  }
  // Other reward types would be handled here (avatars, titles, etc.)

  return true
}

// Extended Achievement System
export type ExtendedAchievementType =
  | 'first_win'
  | 'first_battle'
  | 'win_streak_5'
  | 'win_streak_10'
  | 'win_streak_25'
  | 'battles_10'
  | 'battles_50'
  | 'battles_100'
  | 'battles_500'
  | 'tournament_win'
  | 'tournament_finals'
  | 'tournament_3_wins'
  | 'elo_1200'
  | 'elo_1500'
  | 'elo_1800'
  | 'elo_2000'
  | 'elo_2500'
  | 'spectator_favorite'
  | 'social_butterfly'
  | 'crew_leader'
  | 'crew_champion'
  | 'challenge_master'
  | 'daily_streak_7'
  | 'daily_streak_30'
  | 'theme_master'
  | 'highlight_viral'
  | 'beat_creator'
  | 'generous_gifter'
  | 'season_complete'
  | 'perfect_score'
  | 'comeback_king'
  | 'flawless_victory'

export interface ExtendedAchievement {
  type: ExtendedAchievementType
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  coinReward: number
  xpReward: number
  hidden: boolean
}

export const EXTENDED_ACHIEVEMENTS: Record<ExtendedAchievementType, ExtendedAchievement> = {
  first_battle: { type: 'first_battle', name: 'First Steps', description: 'Complete your first battle', icon: '🎤', rarity: 'common', coinReward: 25, xpReward: 100, hidden: false },
  first_win: { type: 'first_win', name: 'Victory Lap', description: 'Win your first battle', icon: '🏆', rarity: 'common', coinReward: 50, xpReward: 150, hidden: false },
  win_streak_5: { type: 'win_streak_5', name: 'On Fire', description: 'Win 5 battles in a row', icon: '🔥', rarity: 'rare', coinReward: 75, xpReward: 300, hidden: false },
  win_streak_10: { type: 'win_streak_10', name: 'Unstoppable', description: 'Win 10 battles in a row', icon: '⚡', rarity: 'epic', coinReward: 150, xpReward: 500, hidden: false },
  win_streak_25: { type: 'win_streak_25', name: 'Legendary Streak', description: 'Win 25 battles in a row', icon: '💫', rarity: 'legendary', coinReward: 500, xpReward: 1000, hidden: false },
  battles_10: { type: 'battles_10', name: 'Regular', description: 'Complete 10 battles', icon: '🎯', rarity: 'common', coinReward: 25, xpReward: 100, hidden: false },
  battles_50: { type: 'battles_50', name: 'Veteran', description: 'Complete 50 battles', icon: '⭐', rarity: 'rare', coinReward: 50, xpReward: 250, hidden: false },
  battles_100: { type: 'battles_100', name: 'Legend', description: 'Complete 100 battles', icon: '👑', rarity: 'epic', coinReward: 100, xpReward: 500, hidden: false },
  battles_500: { type: 'battles_500', name: 'Hall of Fame', description: 'Complete 500 battles', icon: '🌟', rarity: 'legendary', coinReward: 250, xpReward: 1000, hidden: false },
  tournament_win: { type: 'tournament_win', name: 'Champion', description: 'Win a tournament', icon: '🏅', rarity: 'legendary', coinReward: 500, xpReward: 1000, hidden: false },
  tournament_finals: { type: 'tournament_finals', name: 'Finalist', description: 'Reach a tournament final', icon: '🥈', rarity: 'epic', coinReward: 200, xpReward: 500, hidden: false },
  tournament_3_wins: { type: 'tournament_3_wins', name: 'Tournament Pro', description: 'Win 3 tournaments', icon: '🏆', rarity: 'legendary', coinReward: 750, xpReward: 1500, hidden: false },
  elo_1200: { type: 'elo_1200', name: 'Gold Status', description: 'Reach 1200 ELO', icon: '🥇', rarity: 'common', coinReward: 25, xpReward: 150, hidden: false },
  elo_1500: { type: 'elo_1500', name: 'Diamond Status', description: 'Reach 1500 ELO', icon: '💎', rarity: 'rare', coinReward: 50, xpReward: 300, hidden: false },
  elo_1800: { type: 'elo_1800', name: 'Master Status', description: 'Reach 1800 ELO', icon: '🔮', rarity: 'epic', coinReward: 100, xpReward: 500, hidden: false },
  elo_2000: { type: 'elo_2000', name: 'Legendary Status', description: 'Reach 2000 ELO', icon: '👑', rarity: 'legendary', coinReward: 250, xpReward: 750, hidden: false },
  elo_2500: { type: 'elo_2500', name: 'Mythic Status', description: 'Reach 2500 ELO', icon: '⚜️', rarity: 'legendary', coinReward: 500, xpReward: 1000, hidden: false },
  spectator_favorite: { type: 'spectator_favorite', name: 'Fan Favorite', description: 'Get 100 total spectator votes', icon: '❤️', rarity: 'rare', coinReward: 50, xpReward: 250, hidden: false },
  social_butterfly: { type: 'social_butterfly', name: 'Social Butterfly', description: 'Add 10 friends', icon: '🦋', rarity: 'rare', coinReward: 50, xpReward: 200, hidden: false },
  crew_leader: { type: 'crew_leader', name: 'Crew Leader', description: 'Create and lead a crew', icon: '👥', rarity: 'rare', coinReward: 75, xpReward: 300, hidden: false },
  crew_champion: { type: 'crew_champion', name: 'Crew Champion', description: 'Win a crew battle', icon: '🏴', rarity: 'epic', coinReward: 150, xpReward: 500, hidden: false },
  challenge_master: { type: 'challenge_master', name: 'Challenge Master', description: 'Complete 50 daily challenges', icon: '📋', rarity: 'epic', coinReward: 100, xpReward: 400, hidden: false },
  daily_streak_7: { type: 'daily_streak_7', name: 'Week Warrior', description: 'Log in 7 days in a row', icon: '📅', rarity: 'common', coinReward: 25, xpReward: 150, hidden: false },
  daily_streak_30: { type: 'daily_streak_30', name: 'Month Master', description: 'Log in 30 days in a row', icon: '🗓️', rarity: 'rare', coinReward: 100, xpReward: 500, hidden: false },
  theme_master: { type: 'theme_master', name: 'Theme Master', description: 'Win 10 themed battles', icon: '🎨', rarity: 'rare', coinReward: 75, xpReward: 350, hidden: false },
  highlight_viral: { type: 'highlight_viral', name: 'Viral Star', description: 'Get 1000 views on a highlight', icon: '📈', rarity: 'epic', coinReward: 150, xpReward: 500, hidden: false },
  beat_creator: { type: 'beat_creator', name: 'Beat Creator', description: 'Upload 10 beats', icon: '🎵', rarity: 'rare', coinReward: 50, xpReward: 250, hidden: false },
  generous_gifter: { type: 'generous_gifter', name: 'Generous Gifter', description: 'Gift 1000 coins total', icon: '🎁', rarity: 'rare', coinReward: 100, xpReward: 300, hidden: false },
  season_complete: { type: 'season_complete', name: 'Season Complete', description: 'Reach max level in a season', icon: '🏁', rarity: 'legendary', coinReward: 500, xpReward: 1000, hidden: false },
  perfect_score: { type: 'perfect_score', name: 'Perfect Score', description: 'Get a perfect 100 in a round', icon: '💯', rarity: 'epic', coinReward: 100, xpReward: 400, hidden: true },
  comeback_king: { type: 'comeback_king', name: 'Comeback King', description: 'Win after being down 2 rounds', icon: '👊', rarity: 'epic', coinReward: 100, xpReward: 400, hidden: true },
  flawless_victory: { type: 'flawless_victory', name: 'Flawless Victory', description: 'Win without opponent scoring above 50', icon: '✨', rarity: 'legendary', coinReward: 250, xpReward: 750, hidden: true }
}

// Daily Login Streak
export interface LoginStreak {
  id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_login_date: string
  total_logins: number
  created_at: string
  updated_at: string
}

// Get user's login streak
export async function getLoginStreak(userId: string): Promise<LoginStreak | null> {
  const { data, error } = await supabase
    .from('login_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return createLoginStreak(userId)
    }
    return null
  }
  return data
}

// Create login streak
async function createLoginStreak(userId: string): Promise<LoginStreak | null> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('login_streaks')
    .insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_login_date: today,
      total_logins: 1
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating login streak:', error)
    return null
  }
  return data
}

// Record daily login
export async function recordDailyLogin(userId: string): Promise<{ streak: LoginStreak; coinsEarned: number } | null> {
  const streak = await getLoginStreak(userId)
  if (!streak) return null

  const today = new Date().toISOString().split('T')[0]
  const lastLogin = streak.last_login_date

  // Already logged in today
  if (lastLogin === today) {
    return { streak, coinsEarned: 0 }
  }

  // Check if streak continues
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const streakContinues = lastLogin === yesterdayStr
  const newStreak = streakContinues ? streak.current_streak + 1 : 1
  const newLongest = Math.max(newStreak, streak.longest_streak)

  const { data, error } = await supabase
    .from('login_streaks')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_login_date: today,
      total_logins: streak.total_logins + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', streak.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating login streak:', error)
    return null
  }

  // Calculate bonus coins based on streak
  let coinsEarned = COIN_REWARDS.DAILY_LOGIN
  if (newStreak >= 7) coinsEarned *= 2
  if (newStreak >= 30) coinsEarned *= 3

  await addCoins(userId, coinsEarned, 'daily_login', `Day ${newStreak} login bonus`)

  return { streak: data, coinsEarned }
}

// Cosmetics Store
export type CosmeticType = 'avatar' | 'title' | 'emote' | 'theme' | 'avatar_frame' | 'name_effect'

export interface Cosmetic {
  id: string
  type: CosmeticType
  name: string
  description: string
  image_url: string
  preview_url: string | null
  price_coins: number
  price_premium: number | null // Real currency price
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  is_limited: boolean
  available_until: string | null
  created_at: string
}

export interface UserCosmetic {
  id: string
  user_id: string
  cosmetic_id: string
  equipped: boolean
  acquired_at: string
  // Joined
  cosmetic?: Cosmetic
}

// Get available cosmetics
export async function getAvailableCosmetics(type?: CosmeticType): Promise<Cosmetic[]> {
  const now = new Date().toISOString()

  let query = supabase
    .from('cosmetics')
    .select('*')
    .or(`available_until.is.null,available_until.gt.${now}`)
    .order('rarity', { ascending: true })
    .order('price_coins', { ascending: true })

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching cosmetics:', error)
    return []
  }
  return data || []
}

// Get user's owned cosmetics
export async function getUserCosmetics(userId: string): Promise<UserCosmetic[]> {
  const { data, error } = await supabase
    .from('user_cosmetics')
    .select('*, cosmetic:cosmetics(*)')
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false })

  if (error) {
    console.error('Error fetching user cosmetics:', error)
    return []
  }
  return data || []
}

// Purchase cosmetic
export async function purchaseCosmetic(userId: string, cosmeticId: string): Promise<boolean> {
  // Get cosmetic details
  const { data: cosmetic, error: cosmeticError } = await supabase
    .from('cosmetics')
    .select('*')
    .eq('id', cosmeticId)
    .single()

  if (cosmeticError || !cosmetic) return false

  // Check if already owned
  const { count } = await supabase
    .from('user_cosmetics')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('cosmetic_id', cosmeticId)

  if (count && count > 0) return false

  // Spend coins
  const success = await spendCoins(
    userId,
    cosmetic.price_coins,
    'cosmetic_purchase',
    `Purchased: ${cosmetic.name}`,
    cosmeticId
  )

  if (!success) return false

  // Add to inventory
  const { error } = await supabase
    .from('user_cosmetics')
    .insert({
      user_id: userId,
      cosmetic_id: cosmeticId,
      equipped: false
    })

  if (error) {
    console.error('Error adding cosmetic:', error)
    return false
  }
  return true
}

// Equip/unequip cosmetic
export async function equipCosmetic(userId: string, cosmeticId: string, equipped: boolean): Promise<boolean> {
  // If equipping, unequip others of same type
  if (equipped) {
    const { data: cosmetic } = await supabase
      .from('cosmetics')
      .select('type')
      .eq('id', cosmeticId)
      .single()

    if (cosmetic) {
      // Unequip all of same type
      await supabase
        .from('user_cosmetics')
        .update({ equipped: false })
        .eq('user_id', userId)
        .eq('equipped', true)
        .in('cosmetic_id',
          supabase
            .from('cosmetics')
            .select('id')
            .eq('type', cosmetic.type)
        )
    }
  }

  const { error } = await supabase
    .from('user_cosmetics')
    .update({ equipped })
    .eq('user_id', userId)
    .eq('cosmetic_id', cosmeticId)

  if (error) {
    console.error('Error equipping cosmetic:', error)
    return false
  }
  return true
}

// Get user's equipped cosmetics
export async function getEquippedCosmetics(userId: string): Promise<UserCosmetic[]> {
  const { data, error } = await supabase
    .from('user_cosmetics')
    .select('*, cosmetic:cosmetics(*)')
    .eq('user_id', userId)
    .eq('equipped', true)

  if (error) {
    console.error('Error fetching equipped cosmetics:', error)
    return []
  }
  return data || []
}
