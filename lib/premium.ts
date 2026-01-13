import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from './supabase'

// Premium tier definitions
export type PremiumTier = 'free' | 'plus' | 'pro' | 'elite'

export interface PremiumPlan {
  id: PremiumTier
  name: string
  price: number
  priceYearly: number
  features: string[]
  limits: {
    dailyBattles: number
    beatUploads: number
    privateRooms: boolean
    customAvatars: boolean
    priorityMatchmaking: boolean
    advancedStats: boolean
    tournamentCreation: boolean
    customBeats: boolean
    adFree: boolean
    crewCreation: boolean
    exclusiveBadges: boolean
  }
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceYearly: 0,
    features: [
      '5 battles per day',
      'Basic stats',
      'Public matchmaking',
      'Library beats',
    ],
    limits: {
      dailyBattles: 5,
      beatUploads: 3,
      privateRooms: false,
      customAvatars: false,
      priorityMatchmaking: false,
      advancedStats: false,
      tournamentCreation: false,
      customBeats: false,
      adFree: false,
      crewCreation: false,
      exclusiveBadges: false,
    },
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 4.99,
    priceYearly: 49.99,
    features: [
      '25 battles per day',
      'Private rooms',
      '10 beat uploads',
      'Custom avatars',
      'Ad-free experience',
    ],
    limits: {
      dailyBattles: 25,
      beatUploads: 10,
      privateRooms: true,
      customAvatars: true,
      priorityMatchmaking: false,
      advancedStats: false,
      tournamentCreation: false,
      customBeats: true,
      adFree: true,
      crewCreation: false,
      exclusiveBadges: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    priceYearly: 99.99,
    features: [
      'Unlimited battles',
      'Priority matchmaking',
      'Advanced statistics',
      '50 beat uploads',
      'Create crews',
      'Exclusive badges',
    ],
    limits: {
      dailyBattles: -1, // Unlimited
      beatUploads: 50,
      privateRooms: true,
      customAvatars: true,
      priorityMatchmaking: true,
      advancedStats: true,
      tournamentCreation: false,
      customBeats: true,
      adFree: true,
      crewCreation: true,
      exclusiveBadges: true,
    },
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 19.99,
    priceYearly: 199.99,
    features: [
      'Everything in Pro',
      'Create tournaments',
      'Unlimited beat uploads',
      'Priority support',
      'Early access to features',
      'Elite badge',
    ],
    limits: {
      dailyBattles: -1,
      beatUploads: -1, // Unlimited
      privateRooms: true,
      customAvatars: true,
      priorityMatchmaking: true,
      advancedStats: true,
      tournamentCreation: true,
      customBeats: true,
      adFree: true,
      crewCreation: true,
      exclusiveBadges: true,
    },
  },
]

// Premium state
interface PremiumState {
  tier: PremiumTier
  expiresAt: string | null
  setTier: (tier: PremiumTier, expiresAt?: string) => void
  isFeatureAvailable: (feature: keyof PremiumPlan['limits']) => boolean
  getLimit: (limit: keyof PremiumPlan['limits']) => number | boolean
  getPlan: () => PremiumPlan
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set, get) => ({
      tier: 'free',
      expiresAt: null,

      setTier: (tier, expiresAt) => set({ tier, expiresAt: expiresAt || null }),

      isFeatureAvailable: (feature) => {
        const plan = PREMIUM_PLANS.find(p => p.id === get().tier)
        if (!plan) return false
        const value = plan.limits[feature]
        return typeof value === 'boolean' ? value : value !== 0
      },

      getLimit: (limit) => {
        const plan = PREMIUM_PLANS.find(p => p.id === get().tier)
        if (!plan) return false
        return plan.limits[limit]
      },

      getPlan: () => {
        return PREMIUM_PLANS.find(p => p.id === get().tier) || PREMIUM_PLANS[0]
      },
    }),
    {
      name: 'rap-battle-premium',
    }
  )
)

// Check if user has access to a feature
export function canAccessFeature(tier: PremiumTier, feature: keyof PremiumPlan['limits']): boolean {
  const plan = PREMIUM_PLANS.find(p => p.id === tier)
  if (!plan) return false
  const value = plan.limits[feature]
  return typeof value === 'boolean' ? value : value !== 0
}

// Get the user's daily battle count
export async function getDailyBattleCount(userId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('battles')
    .select('*', { count: 'exact', head: true })
    .eq('player1_id', userId)
    .gte('created_at', today.toISOString())

  if (error) {
    console.error('Error getting battle count:', error)
    return 0
  }

  return count || 0
}

// Check if user can start a new battle
export async function canStartBattle(userId: string, tier: PremiumTier): Promise<{ allowed: boolean; reason?: string }> {
  const plan = PREMIUM_PLANS.find(p => p.id === tier)
  if (!plan) {
    return { allowed: false, reason: 'Invalid subscription tier' }
  }

  const limit = plan.limits.dailyBattles
  if (limit === -1) {
    return { allowed: true }
  }

  const count = await getDailyBattleCount(userId)
  if (count >= limit) {
    return {
      allowed: false,
      reason: `Daily battle limit reached (${count}/${limit}). Upgrade to get more battles!`
    }
  }

  return { allowed: true }
}

// Premium feature badges
export const PREMIUM_BADGES: { tier: PremiumTier; badge: string; color: string }[] = [
  { tier: 'plus', badge: '+', color: 'text-blue-400' },
  { tier: 'pro', badge: 'PRO', color: 'text-purple-400' },
  { tier: 'elite', badge: 'ELITE', color: 'text-gold-400' },
]

export function getPremiumBadge(tier: PremiumTier): { badge: string; color: string } | null {
  return PREMIUM_BADGES.find(b => b.tier === tier) || null
}

// Subscription management (placeholder for actual payment integration)
export interface SubscriptionIntent {
  planId: PremiumTier
  isYearly: boolean
  userId: string
}

export async function createSubscriptionIntent(intent: SubscriptionIntent): Promise<{ checkoutUrl: string } | null> {
  // In production, this would integrate with Stripe, PayPal, etc.
  console.log('Creating subscription intent:', intent)

  // Placeholder - return mock checkout URL
  return {
    checkoutUrl: `/checkout?plan=${intent.planId}&yearly=${intent.isYearly}`
  }
}

export async function cancelSubscription(userId: string): Promise<boolean> {
  // In production, this would cancel the subscription with the payment provider
  console.log('Canceling subscription for user:', userId)
  return true
}

export async function getUserSubscription(userId: string): Promise<{
  tier: PremiumTier
  expiresAt: string | null
  isActive: boolean
} | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  const isActive = data.expires_at ? new Date(data.expires_at) > new Date() : false

  return {
    tier: data.tier as PremiumTier,
    expiresAt: data.expires_at,
    isActive,
  }
}
