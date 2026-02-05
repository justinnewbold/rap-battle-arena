// Growth & Engagement Features
// Streamer Integration, Email Campaigns, Push Notifications, Referral Tiers, Brand Partnerships

import { supabase, Profile, Battle } from './supabase'

// ===========================================
// STREAMER INTEGRATION
// ===========================================

export interface StreamerProfile {
  id: string
  user_id: string
  platform: 'twitch' | 'youtube' | 'kick' | 'other'
  channel_name: string
  channel_url: string
  is_verified: boolean
  is_live: boolean
  current_stream_title: string | null
  viewer_count: number
  follower_count: number
  overlay_enabled: boolean
  overlay_settings: OverlaySettings
  webhook_url: string | null
  api_key: string | null
  created_at: string
  updated_at: string
  // Joined
  user?: Profile
}

export interface OverlaySettings {
  theme: 'dark' | 'light' | 'custom'
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  showScore: boolean
  showRound: boolean
  showTimer: boolean
  showVotes: boolean
  customColors: {
    background: string
    text: string
    accent: string
  }
  transparency: number // 0-100
  scale: number // 0.5-2.0
}

export interface StreamAlert {
  id: string
  streamer_id: string
  alert_type: 'battle_start' | 'battle_end' | 'new_follower' | 'tournament_update' | 'gift_received'
  message: string
  sound_url: string | null
  image_url: string | null
  duration_seconds: number
  created_at: string
}

const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  theme: 'dark',
  position: 'top-right',
  showScore: true,
  showRound: true,
  showTimer: true,
  showVotes: true,
  customColors: {
    background: '#1a1a2e',
    text: '#ffffff',
    accent: '#e94560'
  },
  transparency: 80,
  scale: 1.0
}

// Register as streamer
export async function registerStreamer(
  userId: string,
  platform: StreamerProfile['platform'],
  channelName: string,
  channelUrl: string
): Promise<StreamerProfile | null> {
  const { data, error } = await supabase
    .from('streamer_profiles')
    .insert({
      user_id: userId,
      platform,
      channel_name: channelName,
      channel_url: channelUrl,
      overlay_settings: DEFAULT_OVERLAY_SETTINGS,
      overlay_enabled: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error registering streamer:', error)
    return null
  }
  return data
}

// Get streamer profile
export async function getStreamerProfile(userId: string): Promise<StreamerProfile | null> {
  const { data, error } = await supabase
    .from('streamer_profiles')
    .select('*, user:profiles(*)')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

// Update overlay settings
export async function updateOverlaySettings(
  userId: string,
  settings: Partial<OverlaySettings>
): Promise<boolean> {
  const { data: current } = await supabase
    .from('streamer_profiles')
    .select('overlay_settings')
    .eq('user_id', userId)
    .single()

  const newSettings = { ...current?.overlay_settings, ...settings }

  const { error } = await supabase
    .from('streamer_profiles')
    .update({ overlay_settings: newSettings })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating overlay settings:', error)
    return false
  }
  return true
}

// Generate overlay URL for OBS
export function generateOverlayUrl(userId: string, battleId?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rapbattlearena.com'
  let url = `${baseUrl}/overlay/${userId}`
  if (battleId) {
    url += `?battle=${battleId}`
  }
  return url
}

// Generate API key for streamer integrations
export async function generateStreamerApiKey(userId: string): Promise<string | null> {
  const apiKey = `rba_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`

  const { error } = await supabase
    .from('streamer_profiles')
    .update({ api_key: apiKey })
    .eq('user_id', userId)

  if (error) {
    console.error('Error generating API key:', error)
    return null
  }
  return apiKey
}

// Trigger stream alert
export async function triggerStreamAlert(
  streamerId: string,
  alertType: StreamAlert['alert_type'],
  message: string,
  options: { soundUrl?: string; imageUrl?: string; duration?: number } = {}
): Promise<void> {
  await supabase.from('stream_alerts').insert({
    streamer_id: streamerId,
    alert_type: alertType,
    message,
    sound_url: options.soundUrl || null,
    image_url: options.imageUrl || null,
    duration_seconds: options.duration || 5
  })

  // Also send through webhook if configured
  const { data: streamer } = await supabase
    .from('streamer_profiles')
    .select('webhook_url')
    .eq('id', streamerId)
    .single()

  if (streamer?.webhook_url) {
    fetch(streamer.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertType, message, ...options })
    }).catch(console.error)
  }
}

// Get live streamers
export async function getLiveStreamers(limit: number = 20): Promise<StreamerProfile[]> {
  const { data, error } = await supabase
    .from('streamer_profiles')
    .select('*, user:profiles(id, username, avatar_url, elo_rating)')
    .eq('is_live', true)
    .eq('is_verified', true)
    .order('viewer_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching live streamers:', error)
    return []
  }
  return data || []
}

// ===========================================
// EMAIL CAMPAIGNS
// ===========================================

export type EmailType =
  | 'welcome'
  | 'battle_reminder'
  | 'weekly_digest'
  | 'tournament_invite'
  | 'achievement_unlocked'
  | 'friend_activity'
  | 'promotional'
  | 'account_update'

export interface EmailPreferences {
  id: string
  user_id: string
  welcome: boolean
  battle_reminders: boolean
  weekly_digest: boolean
  tournament_updates: boolean
  achievement_notifications: boolean
  friend_activity: boolean
  promotional: boolean
  account_updates: boolean
  unsubscribed_all: boolean
  created_at: string
  updated_at: string
}

export interface EmailCampaign {
  id: string
  name: string
  subject: string
  preview_text: string
  html_content: string
  text_content: string
  email_type: EmailType
  target_audience: {
    minElo?: number
    maxElo?: number
    hasNotBattledDays?: number
    isPremium?: boolean
    joinedAfter?: string
    joinedBefore?: string
  }
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  scheduled_for: string | null
  sent_at: string | null
  stats: {
    sent: number
    opened: number
    clicked: number
    unsubscribed: number
  }
  created_at: string
}

export interface QueuedEmail {
  id: string
  user_id: string
  email_type: EmailType
  subject: string
  html_content: string
  text_content: string
  campaign_id: string | null
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  error: string | null
  created_at: string
}

// Get user's email preferences
export async function getEmailPreferences(userId: string): Promise<EmailPreferences | null> {
  const { data, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Create default preferences
      return createDefaultEmailPreferences(userId)
    }
    return null
  }
  return data
}

// Create default email preferences
async function createDefaultEmailPreferences(userId: string): Promise<EmailPreferences | null> {
  const { data, error } = await supabase
    .from('email_preferences')
    .insert({
      user_id: userId,
      welcome: true,
      battle_reminders: true,
      weekly_digest: true,
      tournament_updates: true,
      achievement_notifications: true,
      friend_activity: false,
      promotional: true,
      account_updates: true,
      unsubscribed_all: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating email preferences:', error)
    return null
  }
  return data
}

// Update email preferences
export async function updateEmailPreferences(
  userId: string,
  preferences: Partial<Omit<EmailPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('email_preferences')
    .update({
      ...preferences,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating email preferences:', error)
    return false
  }
  return true
}

// Queue email to be sent
export async function queueEmail(
  userId: string,
  emailType: EmailType,
  subject: string,
  htmlContent: string,
  textContent: string,
  campaignId?: string
): Promise<boolean> {
  // Check user preferences
  const prefs = await getEmailPreferences(userId)
  if (!prefs || prefs.unsubscribed_all) return false

  // Check specific preference
  const prefMap: Record<EmailType, keyof EmailPreferences> = {
    welcome: 'welcome',
    battle_reminder: 'battle_reminders',
    weekly_digest: 'weekly_digest',
    tournament_invite: 'tournament_updates',
    achievement_unlocked: 'achievement_notifications',
    friend_activity: 'friend_activity',
    promotional: 'promotional',
    account_update: 'account_updates'
  }

  if (!prefs[prefMap[emailType]]) return false

  const { error } = await supabase.from('queued_emails').insert({
    user_id: userId,
    email_type: emailType,
    subject,
    html_content: htmlContent,
    text_content: textContent,
    campaign_id: campaignId || null,
    status: 'pending'
  })

  if (error) {
    console.error('Error queuing email:', error)
    return false
  }
  return true
}

// Generate weekly digest content
export async function generateWeeklyDigest(userId: string): Promise<{
  subject: string
  html: string
  text: string
} | null> {
  // Get user's weekly stats
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'complete')
    .gte('completed_at', weekAgo.toISOString())

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, elo_rating')
    .eq('id', userId)
    .single()

  if (!profile || !battles) return null

  const wins = battles.filter(b => b.winner_id === userId).length
  const losses = battles.length - wins

  const subject = `Your Week in the Arena - ${wins}W/${losses}L`

  const html = `
    <h1>Hey ${profile.username}!</h1>
    <p>Here's your weekly battle recap:</p>
    <ul>
      <li><strong>Battles:</strong> ${battles.length}</li>
      <li><strong>Wins:</strong> ${wins}</li>
      <li><strong>Losses:</strong> ${losses}</li>
      <li><strong>Current ELO:</strong> ${profile.elo_rating}</li>
    </ul>
    <p>Keep battling to climb the ranks!</p>
  `

  const text = `
    Hey ${profile.username}!

    Your weekly battle recap:
    - Battles: ${battles.length}
    - Wins: ${wins}
    - Losses: ${losses}
    - Current ELO: ${profile.elo_rating}

    Keep battling to climb the ranks!
  `

  return { subject, html, text }
}

// ===========================================
// PUSH NOTIFICATIONS
// ===========================================

export type PushNotificationType =
  | 'battle_challenge'
  | 'battle_ready'
  | 'battle_result'
  | 'friend_online'
  | 'tournament_starting'
  | 'achievement'
  | 'message'
  | 'crew_activity'

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  device_type: 'web' | 'ios' | 'android'
  is_active: boolean
  created_at: string
  last_used_at: string
}

export interface PushPreferences {
  id: string
  user_id: string
  battle_challenges: boolean
  battle_ready: boolean
  battle_results: boolean
  friend_online: boolean
  tournament_updates: boolean
  achievements: boolean
  messages: boolean
  crew_activity: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string // HH:MM
  quiet_hours_end: string
  created_at: string
}

// Save push subscription
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionJSON,
  deviceType: PushSubscription['device_type']
): Promise<boolean> {
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    device_type: deviceType,
    is_active: true,
    last_used_at: new Date().toISOString()
  })

  if (error) {
    console.error('Error saving push subscription:', error)
    return false
  }
  return true
}

// Get user's push preferences
export async function getPushPreferences(userId: string): Promise<PushPreferences | null> {
  const { data, error } = await supabase
    .from('push_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Create defaults
      const { data: newPrefs } = await supabase
        .from('push_preferences')
        .insert({
          user_id: userId,
          battle_challenges: true,
          battle_ready: true,
          battle_results: true,
          friend_online: false,
          tournament_updates: true,
          achievements: true,
          messages: true,
          crew_activity: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00'
        })
        .select()
        .single()
      return newPrefs
    }
    return null
  }
  return data
}

// Send push notification
export async function sendPushNotification(
  userId: string,
  type: PushNotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  // Check preferences
  const prefs = await getPushPreferences(userId)
  if (!prefs) return false

  // Check quiet hours
  if (prefs.quiet_hours_enabled) {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    if (currentTime >= prefs.quiet_hours_start || currentTime <= prefs.quiet_hours_end) {
      return false // In quiet hours
    }
  }

  // Check specific preference
  const prefMap: Record<PushNotificationType, keyof PushPreferences> = {
    battle_challenge: 'battle_challenges',
    battle_ready: 'battle_ready',
    battle_result: 'battle_results',
    friend_online: 'friend_online',
    tournament_starting: 'tournament_updates',
    achievement: 'achievements',
    message: 'messages',
    crew_activity: 'crew_activity'
  }

  if (!prefs[prefMap[type]]) return false

  // Get user's subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!subscriptions || subscriptions.length === 0) return false

  // Queue push notifications
  for (const sub of subscriptions) {
    await supabase.from('push_notification_queue').insert({
      subscription_id: sub.id,
      title,
      body,
      data: data || {},
      status: 'pending'
    })
  }

  return true
}

// ===========================================
// REFERRAL TIERS
// ===========================================

export type ReferralTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export interface ReferralTierConfig {
  tier: ReferralTier
  minReferrals: number
  coinsPerReferral: number
  bonusRewards: string[]
  badge: string
  color: string
}

export interface UserReferralStats {
  id: string
  user_id: string
  tier: ReferralTier
  total_referrals: number
  active_referrals: number // Referrals who completed 10+ battles
  total_coins_earned: number
  referral_code: string
  custom_code: string | null
  created_at: string
  updated_at: string
}

export const REFERRAL_TIERS: ReferralTierConfig[] = [
  {
    tier: 'bronze',
    minReferrals: 0,
    coinsPerReferral: 100,
    bonusRewards: ['Basic referral badge'],
    badge: '🥉',
    color: '#cd7f32'
  },
  {
    tier: 'silver',
    minReferrals: 5,
    coinsPerReferral: 125,
    bonusRewards: ['Silver badge', 'Custom referral code'],
    badge: '🥈',
    color: '#c0c0c0'
  },
  {
    tier: 'gold',
    minReferrals: 15,
    coinsPerReferral: 150,
    bonusRewards: ['Gold badge', 'Exclusive avatar frame', 'Priority support'],
    badge: '🥇',
    color: '#ffd700'
  },
  {
    tier: 'platinum',
    minReferrals: 50,
    coinsPerReferral: 200,
    bonusRewards: ['Platinum badge', 'Free month of Pro', 'Custom title'],
    badge: '💎',
    color: '#e5e4e2'
  },
  {
    tier: 'diamond',
    minReferrals: 100,
    coinsPerReferral: 300,
    bonusRewards: ['Diamond badge', 'Lifetime Pro', 'Featured profile', 'Direct line to team'],
    badge: '💠',
    color: '#b9f2ff'
  }
]

// Get tier for referral count
export function getTierForReferrals(count: number): ReferralTierConfig {
  for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (count >= REFERRAL_TIERS[i].minReferrals) {
      return REFERRAL_TIERS[i]
    }
  }
  return REFERRAL_TIERS[0]
}

// Get user's referral stats
export async function getUserReferralStats(userId: string): Promise<UserReferralStats | null> {
  const { data, error } = await supabase
    .from('user_referral_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return createUserReferralStats(userId)
    }
    return null
  }
  return data
}

// Create referral stats
async function createUserReferralStats(userId: string): Promise<UserReferralStats | null> {
  const referralCode = generateReferralCode()

  const { data, error } = await supabase
    .from('user_referral_stats')
    .insert({
      user_id: userId,
      tier: 'bronze',
      total_referrals: 0,
      active_referrals: 0,
      total_coins_earned: 0,
      referral_code: referralCode
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating referral stats:', error)
    return null
  }
  return data
}

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// Set custom referral code (Silver+ tier)
export async function setCustomReferralCode(userId: string, customCode: string): Promise<boolean> {
  const stats = await getUserReferralStats(userId)
  if (!stats) return false

  const tier = getTierForReferrals(stats.total_referrals)
  if (tier.tier === 'bronze') {
    console.error('Must be Silver tier or higher for custom code')
    return false
  }

  // Check if code is available
  const { count } = await supabase
    .from('user_referral_stats')
    .select('*', { count: 'exact', head: true })
    .or(`referral_code.eq.${customCode},custom_code.eq.${customCode}`)

  if (count && count > 0) {
    console.error('Code already taken')
    return false
  }

  const { error } = await supabase
    .from('user_referral_stats')
    .update({ custom_code: customCode.toUpperCase() })
    .eq('user_id', userId)

  if (error) {
    console.error('Error setting custom code:', error)
    return false
  }
  return true
}

// Process referral
export async function processReferral(
  referrerId: string,
  referredId: string
): Promise<{ success: boolean; coinsAwarded: number }> {
  const stats = await getUserReferralStats(referrerId)
  if (!stats) return { success: false, coinsAwarded: 0 }

  const currentTier = getTierForReferrals(stats.total_referrals)
  const newTotalReferrals = stats.total_referrals + 1
  const newTier = getTierForReferrals(newTotalReferrals)
  const coinsAwarded = currentTier.coinsPerReferral

  // Update stats
  const { error } = await supabase
    .from('user_referral_stats')
    .update({
      total_referrals: newTotalReferrals,
      tier: newTier.tier,
      total_coins_earned: stats.total_coins_earned + coinsAwarded,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', referrerId)

  if (error) {
    console.error('Error processing referral:', error)
    return { success: false, coinsAwarded: 0 }
  }

  // Award coins
  await supabase.rpc('add_coins_to_wallet', {
    p_user_id: referrerId,
    p_amount: coinsAwarded
  })

  // Check for tier upgrade
  if (newTier.tier !== currentTier.tier) {
    await supabase.from('notifications').insert({
      user_id: referrerId,
      type: 'referral_tier_up',
      title: 'Referral Tier Upgraded!',
      message: `You've reached ${newTier.tier.toUpperCase()} tier! ${newTier.bonusRewards.join(', ')}`,
      data: { new_tier: newTier.tier }
    })
  }

  return { success: true, coinsAwarded }
}

// ===========================================
// BRAND PARTNERSHIPS
// ===========================================

export interface BrandPartnership {
  id: string
  brand_name: string
  brand_logo_url: string
  brand_website: string | null
  partnership_type: 'sponsor' | 'collaboration' | 'affiliate'
  description: string
  is_active: boolean
  start_date: string
  end_date: string | null
  created_at: string
}

export interface BrandContent {
  id: string
  partnership_id: string
  content_type: 'beat_pack' | 'avatar' | 'theme' | 'badge' | 'tournament'
  name: string
  description: string
  preview_url: string | null
  content_data: Record<string, any>
  price_coins: number | null
  is_free: boolean
  is_limited: boolean
  available_until: string | null
  claim_count: number
  max_claims: number | null
  created_at: string
  // Joined
  partnership?: BrandPartnership
}

export interface UserBrandClaim {
  id: string
  user_id: string
  content_id: string
  claimed_at: string
}

// Get active brand partnerships
export async function getActivePartnerships(): Promise<BrandPartnership[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('brand_partnerships')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', now)
    .or(`end_date.is.null,end_date.gt.${now}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching partnerships:', error)
    return []
  }
  return data || []
}

// Get brand content
export async function getBrandContent(partnershipId?: string): Promise<BrandContent[]> {
  const now = new Date().toISOString()

  let query = supabase
    .from('brand_content')
    .select(`
      *,
      partnership:brand_partnerships(*)
    `)
    .or(`available_until.is.null,available_until.gt.${now}`)

  if (partnershipId) {
    query = query.eq('partnership_id', partnershipId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching brand content:', error)
    return []
  }
  return data || []
}

// Claim brand content
export async function claimBrandContent(userId: string, contentId: string): Promise<boolean> {
  // Check if already claimed
  const { count: existingClaim } = await supabase
    .from('user_brand_claims')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('content_id', contentId)

  if (existingClaim && existingClaim > 0) {
    console.error('Content already claimed')
    return false
  }

  // Check content availability
  const { data: content } = await supabase
    .from('brand_content')
    .select('*')
    .eq('id', contentId)
    .single()

  if (!content) {
    console.error('Content not found')
    return false
  }

  if (content.max_claims && content.claim_count >= content.max_claims) {
    console.error('Content sold out')
    return false
  }

  if (content.available_until && new Date(content.available_until) < new Date()) {
    console.error('Content no longer available')
    return false
  }

  // If not free, check coins
  if (!content.is_free && content.price_coins) {
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (!wallet || wallet.balance < content.price_coins) {
      console.error('Insufficient balance')
      return false
    }

    // Spend coins
    await supabase.rpc('spend_coins_from_wallet', {
      p_user_id: userId,
      p_amount: content.price_coins
    })
  }

  // Create claim
  const { error: claimError } = await supabase
    .from('user_brand_claims')
    .insert({
      user_id: userId,
      content_id: contentId
    })

  if (claimError) {
    console.error('Error claiming content:', claimError)
    return false
  }

  // Update claim count
  await supabase
    .from('brand_content')
    .update({ claim_count: content.claim_count + 1 })
    .eq('id', contentId)

  // Grant content based on type
  await grantBrandContentToUser(userId, content)

  return true
}

// Grant brand content to user
async function grantBrandContentToUser(userId: string, content: BrandContent): Promise<void> {
  switch (content.content_type) {
    case 'beat_pack':
      // Add beats to user's library
      const beatIds = content.content_data.beat_ids || []
      for (const beatId of beatIds) {
        await supabase.from('user_beat_library').insert({
          user_id: userId,
          beat_id: beatId,
          source: 'brand_partnership'
        })
      }
      break

    case 'avatar':
      await supabase.from('user_cosmetics').insert({
        user_id: userId,
        cosmetic_id: content.content_data.cosmetic_id,
        source: 'brand_partnership'
      })
      break

    case 'theme':
      await supabase.from('user_themes').insert({
        user_id: userId,
        theme_id: content.content_data.theme_id,
        source: 'brand_partnership'
      })
      break

    case 'badge':
      await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: content.content_data.badge_id,
        source: 'brand_partnership'
      })
      break
  }
}

// Get user's claimed brand content
export async function getUserBrandClaims(userId: string): Promise<UserBrandClaim[]> {
  const { data, error } = await supabase
    .from('user_brand_claims')
    .select(`
      *,
      content:brand_content(*, partnership:brand_partnerships(*))
    `)
    .eq('user_id', userId)
    .order('claimed_at', { ascending: false })

  if (error) {
    console.error('Error fetching user claims:', error)
    return []
  }
  return data || []
}

// Featured brand content for homepage
export async function getFeaturedBrandContent(limit: number = 3): Promise<BrandContent[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('brand_content')
    .select(`
      *,
      partnership:brand_partnerships(*)
    `)
    .or(`available_until.is.null,available_until.gt.${now}`)
    .eq('is_limited', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching featured content:', error)
    return []
  }
  return data || []
}
