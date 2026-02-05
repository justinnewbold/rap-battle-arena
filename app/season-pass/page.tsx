'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/lib/store'
import {
  getCurrentSeason,
  getSeasonRewards,
  getUserSeasonProgress,
  claimSeasonReward,
  upgradeToPremiumPass,
  Season,
  SeasonReward,
  UserSeasonProgress,
  XP_PER_LEVEL
} from '@/lib/gamification'
import { getUserWallet, spendCoins } from '@/lib/gamification'

export default function SeasonPassPage() {
  const { user } = useUserStore()
  const [season, setSeason] = useState<Season | null>(null)
  const [rewards, setRewards] = useState<SeasonReward[]>([])
  const [progress, setProgress] = useState<UserSeasonProgress | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    const currentSeason = await getCurrentSeason()
    setSeason(currentSeason)

    if (currentSeason) {
      const [rewardsList, userProgress] = await Promise.all([
        getSeasonRewards(currentSeason.id),
        user ? getUserSeasonProgress(user.id, currentSeason.id) : Promise.resolve(null)
      ])
      setRewards(rewardsList)
      setProgress(userProgress)
    }

    if (user) {
      const wallet = await getUserWallet(user.id)
      setWalletBalance(wallet?.balance || 0)
    }

    setLoading(false)
  }

  async function handleClaimReward(rewardId: string) {
    if (!user || !season) return
    setClaiming(rewardId)

    const success = await claimSeasonReward(user.id, season.id, rewardId)
    if (success) {
      await loadData()
    }
    setClaiming(null)
  }

  async function handleUpgrade() {
    if (!user || !season) return
    setUpgrading(true)

    // Premium pass costs 1000 coins
    const PREMIUM_COST = 1000

    const spent = await spendCoins(
      user.id,
      PREMIUM_COST,
      'season_pass_upgrade',
      `Upgraded to Premium Season Pass - ${season.name}`,
      season.id
    )

    if (spent) {
      await upgradeToPremiumPass(user.id, season.id)
      await loadData()
    }
    setUpgrading(false)
  }

  const isRewardUnlocked = (reward: SeasonReward) => {
    if (!progress) return false
    if (progress.level < reward.level) return false
    if (reward.tier === 'premium' && !progress.has_premium) return false
    return true
  }

  const isRewardClaimed = (rewardId: string) => {
    return progress?.claimed_rewards?.includes(rewardId) || false
  }

  const progressPercent = progress ? ((progress.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100 : 0

  const rewardTypeIcons: Record<string, string> = {
    coins: '🪙',
    avatar: '👤',
    title: '🏷️',
    beat: '🎵',
    emote: '😎',
    theme: '🎨'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
      </div>
    )
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Active Season</h2>
          <p className="text-gray-400">Check back soon for the next season!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Season Header */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm text-purple-400 uppercase tracking-wider">Season {season.number}</span>
              <h1 className="text-4xl font-bold mt-1">{season.name}</h1>
              <p className="text-gray-400 mt-2">{season.description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Ends in</div>
              <div className="text-xl font-bold">
                {Math.ceil((new Date(season.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
          </div>

          {/* Progress */}
          {user && progress && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-2xl font-bold">Level {progress.level}</span>
                  {progress.has_premium && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                      PREMIUM
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {progress.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP
                </div>
              </div>
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                />
              </div>
            </div>
          )}

          {/* Upgrade Button */}
          {user && progress && !progress.has_premium && (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-yellow-400">Upgrade to Premium</h3>
                  <p className="text-sm text-gray-400">Unlock exclusive rewards at every level!</p>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading || walletBalance < 1000}
                  className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg disabled:opacity-50"
                >
                  {upgrading ? 'Upgrading...' : '🪙 1000 Coins'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rewards Track */}
        <div className="space-y-4">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
            const freeReward = rewards.find(r => r.level === level && r.tier === 'free')
            const premiumReward = rewards.find(r => r.level === level && r.tier === 'premium')
            const currentLevel = progress?.level || 0

            return (
              <motion.div
                key={level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: level * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  currentLevel >= level ? 'bg-gray-800' : 'bg-gray-800/30'
                }`}
              >
                {/* Level Badge */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  currentLevel >= level
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                    : 'bg-gray-700'
                }`}>
                  {level}
                </div>

                {/* Free Reward */}
                <div className={`flex-1 p-3 rounded-lg border ${
                  currentLevel >= level
                    ? 'bg-gray-700/50 border-gray-600'
                    : 'bg-gray-800/50 border-gray-700'
                }`}>
                  {freeReward ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{rewardTypeIcons[freeReward.reward_type] || '🎁'}</span>
                        <div>
                          <div className="font-semibold">{freeReward.reward_name}</div>
                          <div className="text-xs text-gray-400">{freeReward.reward_description}</div>
                        </div>
                      </div>
                      {user && isRewardUnlocked(freeReward) && !isRewardClaimed(freeReward.id) && (
                        <button
                          onClick={() => handleClaimReward(freeReward.id)}
                          disabled={claiming === freeReward.id}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold"
                        >
                          {claiming === freeReward.id ? '...' : 'Claim'}
                        </button>
                      )}
                      {isRewardClaimed(freeReward.id) && (
                        <span className="px-3 py-1 bg-gray-600 rounded text-sm">Claimed</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center">No free reward</div>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-gray-600" />

                {/* Premium Reward */}
                <div className={`flex-1 p-3 rounded-lg border ${
                  currentLevel >= level && progress?.has_premium
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-gray-800/50 border-gray-700'
                }`}>
                  {premiumReward ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{rewardTypeIcons[premiumReward.reward_type] || '🎁'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{premiumReward.reward_name}</span>
                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                              PREMIUM
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">{premiumReward.reward_description}</div>
                        </div>
                      </div>
                      {user && progress?.has_premium && isRewardUnlocked(premiumReward) && !isRewardClaimed(premiumReward.id) && (
                        <button
                          onClick={() => handleClaimReward(premiumReward.id)}
                          disabled={claiming === premiumReward.id}
                          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded text-sm font-semibold"
                        >
                          {claiming === premiumReward.id ? '...' : 'Claim'}
                        </button>
                      )}
                      {isRewardClaimed(premiumReward.id) && (
                        <span className="px-3 py-1 bg-gray-600 rounded text-sm">Claimed</span>
                      )}
                      {!progress?.has_premium && (
                        <span className="text-2xl">🔒</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center">No premium reward</div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Login CTA */}
        {!user && (
          <div className="mt-8 p-6 bg-gray-800/50 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">Sign in to track your progress</h2>
            <p className="text-gray-400 mb-4">Complete battles to earn XP and unlock rewards!</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
