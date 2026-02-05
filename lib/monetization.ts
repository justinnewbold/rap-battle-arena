import { supabase, Profile } from './supabase'

// Gift Subscriptions
export type SubscriptionTier = 'plus' | 'pro' | 'elite'

export interface GiftSubscription {
  id: string
  gifter_id: string
  recipient_id: string
  tier: SubscriptionTier
  duration_months: number
  message: string | null
  is_anonymous: boolean
  redeemed: boolean
  redeemed_at: string | null
  expires_at: string
  created_at: string
  // Joined
  gifter?: Profile
  recipient?: Profile
}

export interface SubscriptionPricing {
  tier: SubscriptionTier
  name: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  giftPricing: {
    1: number  // 1 month
    3: number  // 3 months
    6: number  // 6 months
    12: number // 12 months
  }
}

// Subscription pricing configuration
export const SUBSCRIPTION_PRICING: Record<SubscriptionTier, SubscriptionPricing> = {
  plus: {
    tier: 'plus',
    name: 'Plus',
    monthlyPrice: 4.99,
    yearlyPrice: 49.99,
    features: [
      '25 battles per day',
      'Private battle rooms',
      'Custom avatars',
      '10 beat uploads',
      'Ad-free experience'
    ],
    giftPricing: { 1: 4.99, 3: 12.99, 6: 24.99, 12: 44.99 }
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: [
      'Unlimited battles',
      'Advanced analytics',
      '50 beat uploads',
      'Create crews',
      'Priority matchmaking',
      'All Plus features'
    ],
    giftPricing: { 1: 9.99, 3: 26.99, 6: 49.99, 12: 89.99 }
  },
  elite: {
    tier: 'elite',
    name: 'Elite',
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    features: [
      'Tournament creation',
      'Unlimited beat uploads',
      'Priority support',
      'Exclusive badges',
      'Early access to features',
      'All Pro features'
    ],
    giftPricing: { 1: 19.99, 3: 54.99, 6: 99.99, 12: 179.99 }
  }
}

// Purchase gift subscription
export async function purchaseGiftSubscription(
  gifterId: string,
  recipientId: string,
  tier: SubscriptionTier,
  durationMonths: 1 | 3 | 6 | 12,
  message?: string,
  isAnonymous: boolean = false
): Promise<GiftSubscription | null> {
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

  const { data, error } = await supabase
    .from('gift_subscriptions')
    .insert({
      gifter_id: gifterId,
      recipient_id: recipientId,
      tier,
      duration_months: durationMonths,
      message: message || null,
      is_anonymous: isAnonymous,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating gift subscription:', error)
    return null
  }

  // Notify recipient
  await supabase.from('notifications').insert({
    user_id: recipientId,
    type: 'gift_subscription',
    title: 'You received a gift!',
    message: isAnonymous
      ? `Someone gifted you ${durationMonths} month(s) of ${tier.toUpperCase()}!`
      : `You received a ${tier.toUpperCase()} subscription gift!`,
    data: { gift_id: data.id, anonymous: isAnonymous }
  })

  return data
}

// Redeem gift subscription
export async function redeemGiftSubscription(giftId: string, userId: string): Promise<boolean> {
  // Verify the gift belongs to this user and is not redeemed
  const { data: gift, error: fetchError } = await supabase
    .from('gift_subscriptions')
    .select('*')
    .eq('id', giftId)
    .eq('recipient_id', userId)
    .eq('redeemed', false)
    .single()

  if (fetchError || !gift) {
    console.error('Gift not found or already redeemed')
    return false
  }

  // Check if gift is expired
  if (new Date(gift.expires_at) < new Date()) {
    console.error('Gift has expired')
    return false
  }

  // Mark as redeemed
  const { error: updateError } = await supabase
    .from('gift_subscriptions')
    .update({
      redeemed: true,
      redeemed_at: new Date().toISOString()
    })
    .eq('id', giftId)

  if (updateError) {
    console.error('Error redeeming gift:', updateError)
    return false
  }

  // Activate subscription
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + gift.duration_months)

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    tier: gift.tier,
    is_active: true,
    starts_at: new Date().toISOString(),
    ends_at: endDate.toISOString(),
    source: 'gift',
    gift_id: giftId
  })

  return true
}

// Get pending gifts for user
export async function getPendingGifts(userId: string): Promise<GiftSubscription[]> {
  const { data, error } = await supabase
    .from('gift_subscriptions')
    .select(`
      *,
      gifter:profiles!gift_subscriptions_gifter_id_fkey(id, username, avatar_url)
    `)
    .eq('recipient_id', userId)
    .eq('redeemed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending gifts:', error)
    return []
  }
  return data || []
}

// Get sent gifts
export async function getSentGifts(userId: string): Promise<GiftSubscription[]> {
  const { data, error } = await supabase
    .from('gift_subscriptions')
    .select(`
      *,
      recipient:profiles!gift_subscriptions_recipient_id_fkey(id, username, avatar_url)
    `)
    .eq('gifter_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sent gifts:', error)
    return []
  }
  return data || []
}

// Virtual Gifts (during battles)
export interface VirtualGift {
  id: string
  name: string
  description: string
  icon_url: string
  animation_url: string | null
  coin_cost: number
  coin_value_to_recipient: number // How much the recipient gets
  category: 'basic' | 'premium' | 'legendary'
  is_animated: boolean
  created_at: string
}

export interface SentGift {
  id: string
  gift_id: string
  sender_id: string
  recipient_id: string
  battle_id: string | null
  quantity: number
  total_coins_spent: number
  total_coins_to_recipient: number
  message: string | null
  created_at: string
  // Joined
  gift?: VirtualGift
  sender?: Profile
  recipient?: Profile
}

// Default virtual gifts
export const VIRTUAL_GIFTS: Omit<VirtualGift, 'id' | 'created_at'>[] = [
  {
    name: 'Microphone',
    description: 'Show support with a mic!',
    icon_url: '/gifts/mic.png',
    animation_url: null,
    coin_cost: 10,
    coin_value_to_recipient: 5,
    category: 'basic',
    is_animated: false
  },
  {
    name: 'Fire',
    description: 'That verse was fire!',
    icon_url: '/gifts/fire.png',
    animation_url: '/gifts/fire.gif',
    coin_cost: 25,
    coin_value_to_recipient: 12,
    category: 'basic',
    is_animated: true
  },
  {
    name: 'Crown',
    description: 'Bow down to royalty',
    icon_url: '/gifts/crown.png',
    animation_url: '/gifts/crown.gif',
    coin_cost: 50,
    coin_value_to_recipient: 25,
    category: 'premium',
    is_animated: true
  },
  {
    name: 'Trophy',
    description: 'Champion-level performance',
    icon_url: '/gifts/trophy.png',
    animation_url: '/gifts/trophy.gif',
    coin_cost: 100,
    coin_value_to_recipient: 50,
    category: 'premium',
    is_animated: true
  },
  {
    name: 'Diamond Rain',
    description: 'Make it rain diamonds',
    icon_url: '/gifts/diamond-rain.png',
    animation_url: '/gifts/diamond-rain.gif',
    coin_cost: 250,
    coin_value_to_recipient: 125,
    category: 'legendary',
    is_animated: true
  },
  {
    name: 'Platinum Record',
    description: 'Certified platinum performance',
    icon_url: '/gifts/platinum.png',
    animation_url: '/gifts/platinum.gif',
    coin_cost: 500,
    coin_value_to_recipient: 250,
    category: 'legendary',
    is_animated: true
  },
  {
    name: 'Stadium',
    description: 'Fill the stadium for them',
    icon_url: '/gifts/stadium.png',
    animation_url: '/gifts/stadium.gif',
    coin_cost: 1000,
    coin_value_to_recipient: 500,
    category: 'legendary',
    is_animated: true
  }
]

// Get available virtual gifts
export async function getVirtualGifts(): Promise<VirtualGift[]> {
  const { data, error } = await supabase
    .from('virtual_gifts')
    .select('*')
    .order('coin_cost', { ascending: true })

  if (error) {
    console.error('Error fetching virtual gifts:', error)
    return []
  }
  return data || []
}

// Send a virtual gift
export async function sendVirtualGift(
  senderId: string,
  recipientId: string,
  giftId: string,
  quantity: number = 1,
  battleId?: string,
  message?: string
): Promise<SentGift | null> {
  // Get gift details
  const { data: gift, error: giftError } = await supabase
    .from('virtual_gifts')
    .select('*')
    .eq('id', giftId)
    .single()

  if (giftError || !gift) {
    console.error('Gift not found')
    return null
  }

  const totalCost = gift.coin_cost * quantity
  const totalToRecipient = gift.coin_value_to_recipient * quantity

  // Check sender balance
  const { data: wallet } = await supabase
    .from('user_wallets')
    .select('balance')
    .eq('user_id', senderId)
    .single()

  if (!wallet || wallet.balance < totalCost) {
    console.error('Insufficient balance')
    return null
  }

  // Deduct from sender
  await supabase.rpc('spend_coins_from_wallet', {
    p_user_id: senderId,
    p_amount: totalCost
  })

  // Add to recipient
  await supabase.rpc('add_coins_to_wallet', {
    p_user_id: recipientId,
    p_amount: totalToRecipient
  })

  // Record the gift
  const { data: sentGift, error } = await supabase
    .from('sent_gifts')
    .insert({
      gift_id: giftId,
      sender_id: senderId,
      recipient_id: recipientId,
      battle_id: battleId || null,
      quantity,
      total_coins_spent: totalCost,
      total_coins_to_recipient: totalToRecipient,
      message: message || null
    })
    .select(`
      *,
      gift:virtual_gifts(*),
      sender:profiles!sent_gifts_sender_id_fkey(id, username, avatar_url)
    `)
    .single()

  if (error) {
    console.error('Error recording gift:', error)
    return null
  }

  // Notify recipient
  await supabase.from('notifications').insert({
    user_id: recipientId,
    type: 'virtual_gift',
    title: 'You received a gift!',
    message: `${sentGift.sender?.username} sent you ${quantity}x ${gift.name}!`,
    data: { sent_gift_id: sentGift.id, battle_id: battleId }
  })

  return sentGift
}

// Get gifts received in a battle
export async function getBattleGifts(battleId: string): Promise<SentGift[]> {
  const { data, error } = await supabase
    .from('sent_gifts')
    .select(`
      *,
      gift:virtual_gifts(*),
      sender:profiles!sent_gifts_sender_id_fkey(id, username, avatar_url),
      recipient:profiles!sent_gifts_recipient_id_fkey(id, username, avatar_url)
    `)
    .eq('battle_id', battleId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching battle gifts:', error)
    return []
  }
  return data || []
}

// Get user's received gifts
export async function getReceivedGifts(userId: string, limit: number = 50): Promise<SentGift[]> {
  const { data, error } = await supabase
    .from('sent_gifts')
    .select(`
      *,
      gift:virtual_gifts(*),
      sender:profiles!sent_gifts_sender_id_fkey(id, username, avatar_url)
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching received gifts:', error)
    return []
  }
  return data || []
}

// Get total gifts value for user
export async function getTotalGiftsValue(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('sent_gifts')
    .select('total_coins_to_recipient')
    .eq('recipient_id', userId)

  if (error) {
    console.error('Error calculating gifts value:', error)
    return 0
  }

  return (data || []).reduce((sum, gift) => sum + gift.total_coins_to_recipient, 0)
}

// Creator Revenue Splits
export interface CreatorAccount {
  id: string
  user_id: string
  is_verified: boolean
  payout_method: 'paypal' | 'stripe' | 'bank_transfer' | null
  payout_details: Record<string, string> | null
  total_earnings: number
  pending_balance: number
  lifetime_payouts: number
  minimum_payout: number
  last_payout_at: string | null
  created_at: string
  updated_at: string
  // Joined
  user?: Profile
}

export interface CreatorEarning {
  id: string
  creator_id: string
  source: 'beat_sale' | 'gift_received' | 'premium_battle' | 'tournament_prize' | 'referral'
  amount: number
  gross_amount: number
  platform_fee: number
  description: string
  reference_id: string | null
  status: 'pending' | 'available' | 'paid'
  created_at: string
  paid_at: string | null
}

export interface Payout {
  id: string
  creator_id: string
  amount: number
  method: 'paypal' | 'stripe' | 'bank_transfer'
  status: 'pending' | 'processing' | 'complete' | 'failed'
  transaction_id: string | null
  failure_reason: string | null
  requested_at: string
  processed_at: string | null
}

// Platform fee configuration (percentage)
export const PLATFORM_FEES = {
  beat_sale: 0.15,        // 15% fee on beat sales
  gift_received: 0.10,    // 10% fee on gifts (already factored into gift values)
  premium_battle: 0.20,   // 20% fee on premium battle earnings
  tournament_prize: 0.10, // 10% fee on tournament prizes
  referral: 0.00          // 0% fee on referral bonuses
}

// Get or create creator account
export async function getCreatorAccount(userId: string): Promise<CreatorAccount | null> {
  const { data, error } = await supabase
    .from('creator_accounts')
    .select('*, user:profiles(*)')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Create new account
      const { data: newAccount, error: createError } = await supabase
        .from('creator_accounts')
        .insert({
          user_id: userId,
          minimum_payout: 25 // $25 minimum
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating creator account:', createError)
        return null
      }
      return newAccount
    }
    return null
  }
  return data
}

// Update payout method
export async function updatePayoutMethod(
  userId: string,
  method: CreatorAccount['payout_method'],
  details: Record<string, string>
): Promise<boolean> {
  const { error } = await supabase
    .from('creator_accounts')
    .update({
      payout_method: method,
      payout_details: details,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating payout method:', error)
    return false
  }
  return true
}

// Record creator earning
export async function recordCreatorEarning(
  userId: string,
  source: CreatorEarning['source'],
  grossAmount: number,
  description: string,
  referenceId?: string
): Promise<CreatorEarning | null> {
  // Calculate platform fee
  const platformFee = Math.floor(grossAmount * PLATFORM_FEES[source] * 100) / 100
  const netAmount = grossAmount - platformFee

  // Get or create creator account
  const account = await getCreatorAccount(userId)
  if (!account) return null

  // Record earning
  const { data: earning, error } = await supabase
    .from('creator_earnings')
    .insert({
      creator_id: account.id,
      source,
      amount: netAmount,
      gross_amount: grossAmount,
      platform_fee: platformFee,
      description,
      reference_id: referenceId || null,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error recording earning:', error)
    return null
  }

  // Update account balances
  await supabase
    .from('creator_accounts')
    .update({
      total_earnings: account.total_earnings + netAmount,
      pending_balance: account.pending_balance + netAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', account.id)

  return earning
}

// Get creator earnings
export async function getCreatorEarnings(
  userId: string,
  options: { source?: CreatorEarning['source']; status?: CreatorEarning['status']; limit?: number } = {}
): Promise<CreatorEarning[]> {
  const account = await getCreatorAccount(userId)
  if (!account) return []

  let query = supabase
    .from('creator_earnings')
    .select('*')
    .eq('creator_id', account.id)
    .order('created_at', { ascending: false })

  if (options.source) {
    query = query.eq('source', options.source)
  }
  if (options.status) {
    query = query.eq('status', options.status)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching earnings:', error)
    return []
  }
  return data || []
}

// Get earnings summary
export async function getEarningsSummary(userId: string): Promise<{
  totalEarnings: number
  pendingBalance: number
  availableBalance: number
  lifetimePayouts: number
  earningsBySource: Record<CreatorEarning['source'], number>
  recentEarnings: CreatorEarning[]
}> {
  const account = await getCreatorAccount(userId)
  if (!account) {
    return {
      totalEarnings: 0,
      pendingBalance: 0,
      availableBalance: 0,
      lifetimePayouts: 0,
      earningsBySource: {
        beat_sale: 0,
        gift_received: 0,
        premium_battle: 0,
        tournament_prize: 0,
        referral: 0
      },
      recentEarnings: []
    }
  }

  // Get earnings by source
  const { data: earnings } = await supabase
    .from('creator_earnings')
    .select('source, amount')
    .eq('creator_id', account.id)

  const earningsBySource: Record<CreatorEarning['source'], number> = {
    beat_sale: 0,
    gift_received: 0,
    premium_battle: 0,
    tournament_prize: 0,
    referral: 0
  }

  for (const earning of earnings || []) {
    earningsBySource[earning.source as CreatorEarning['source']] += earning.amount
  }

  // Get available balance (earnings marked as 'available')
  const { data: availableEarnings } = await supabase
    .from('creator_earnings')
    .select('amount')
    .eq('creator_id', account.id)
    .eq('status', 'available')

  const availableBalance = (availableEarnings || []).reduce((sum, e) => sum + e.amount, 0)

  // Get recent earnings
  const recentEarnings = await getCreatorEarnings(userId, { limit: 10 })

  return {
    totalEarnings: account.total_earnings,
    pendingBalance: account.pending_balance,
    availableBalance,
    lifetimePayouts: account.lifetime_payouts,
    earningsBySource,
    recentEarnings
  }
}

// Request payout
export async function requestPayout(userId: string, amount: number): Promise<Payout | null> {
  const account = await getCreatorAccount(userId)
  if (!account) return null

  // Validate
  if (!account.payout_method || !account.payout_details) {
    console.error('No payout method configured')
    return null
  }

  if (amount < account.minimum_payout) {
    console.error(`Minimum payout is $${account.minimum_payout}`)
    return null
  }

  // Check available balance
  const { data: availableEarnings } = await supabase
    .from('creator_earnings')
    .select('id, amount')
    .eq('creator_id', account.id)
    .eq('status', 'available')

  const availableBalance = (availableEarnings || []).reduce((sum, e) => sum + e.amount, 0)

  if (amount > availableBalance) {
    console.error('Insufficient available balance')
    return null
  }

  // Create payout request
  const { data: payout, error } = await supabase
    .from('payouts')
    .insert({
      creator_id: account.id,
      amount,
      method: account.payout_method,
      status: 'pending',
      requested_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating payout request:', error)
    return null
  }

  // Mark earnings as paid (up to payout amount)
  let remaining = amount
  for (const earning of availableEarnings || []) {
    if (remaining <= 0) break

    await supabase
      .from('creator_earnings')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', earning.id)

    remaining -= earning.amount
  }

  // Update account
  await supabase
    .from('creator_accounts')
    .update({
      pending_balance: account.pending_balance - amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', account.id)

  return payout
}

// Get payout history
export async function getPayoutHistory(userId: string): Promise<Payout[]> {
  const account = await getCreatorAccount(userId)
  if (!account) return []

  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('creator_id', account.id)
    .order('requested_at', { ascending: false })

  if (error) {
    console.error('Error fetching payouts:', error)
    return []
  }
  return data || []
}

// Referral System
export interface ReferralCode {
  id: string
  user_id: string
  code: string
  uses: number
  max_uses: number | null
  coins_per_referral: number
  is_active: boolean
  created_at: string
  // Joined
  user?: Profile
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  referral_code_id: string
  coins_awarded: number
  created_at: string
  // Joined
  referrer?: Profile
  referred?: Profile
}

// Get or create referral code
export async function getReferralCode(userId: string): Promise<ReferralCode | null> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Generate new code
      const code = generateReferralCode()

      const { data: newCode, error: createError } = await supabase
        .from('referral_codes')
        .insert({
          user_id: userId,
          code,
          coins_per_referral: 100 // Default bonus
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating referral code:', createError)
        return null
      }
      return newCode
    }
    return null
  }
  return data
}

// Generate unique referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Use referral code
export async function useReferralCode(newUserId: string, code: string): Promise<boolean> {
  // Find the code
  const { data: referralCode, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (error || !referralCode) {
    console.error('Invalid referral code')
    return false
  }

  // Check if user already used a code
  const { count: existingReferral } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referred_id', newUserId)

  if (existingReferral && existingReferral > 0) {
    console.error('User already used a referral code')
    return false
  }

  // Check max uses
  if (referralCode.max_uses && referralCode.uses >= referralCode.max_uses) {
    console.error('Referral code has reached maximum uses')
    return false
  }

  // Create referral record
  const { error: referralError } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referralCode.user_id,
      referred_id: newUserId,
      referral_code_id: referralCode.id,
      coins_awarded: referralCode.coins_per_referral
    })

  if (referralError) {
    console.error('Error creating referral:', referralError)
    return false
  }

  // Update code uses
  await supabase
    .from('referral_codes')
    .update({ uses: referralCode.uses + 1 })
    .eq('id', referralCode.id)

  // Award coins to referrer
  await supabase.rpc('add_coins_to_wallet', {
    p_user_id: referralCode.user_id,
    p_amount: referralCode.coins_per_referral
  })

  // Award coins to new user too
  await supabase.rpc('add_coins_to_wallet', {
    p_user_id: newUserId,
    p_amount: 50 // Bonus for using a referral code
  })

  return true
}

// Get user's referrals
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      *,
      referred:profiles!referrals_referred_id_fkey(id, username, avatar_url, created_at)
    `)
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching referrals:', error)
    return []
  }
  return data || []
}

// Get referral stats
export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number
  totalCoinsEarned: number
  referralCode: string
}> {
  const code = await getReferralCode(userId)

  const { data: referrals } = await supabase
    .from('referrals')
    .select('coins_awarded')
    .eq('referrer_id', userId)

  const totalReferrals = referrals?.length || 0
  const totalCoinsEarned = (referrals || []).reduce((sum, r) => sum + r.coins_awarded, 0)

  return {
    totalReferrals,
    totalCoinsEarned,
    referralCode: code?.code || ''
  }
}
