'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'
import {
  getAIOpponents,
  getUserUnlockedOpponents,
  unlockAIOpponent,
  startAIBattle,
  AIOpponent,
  AI_OPPONENTS
} from '@/lib/ai-features'
import { getUserWallet, spendCoins } from '@/lib/gamification'

export default function AIBattlesPage() {
  const router = useRouter()
  const { user } = useUserStore()
  const [opponents, setOpponents] = useState<AIOpponent[]>([])
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedOpponent, setSelectedOpponent] = useState<AIOpponent | null>(null)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const [opponentsList, unlocked, wallet] = await Promise.all([
      getAIOpponents(),
      getUserUnlockedOpponents(user.id),
      getUserWallet(user.id)
    ])
    setOpponents(opponentsList.length > 0 ? opponentsList : AI_OPPONENTS as unknown as AIOpponent[])
    setUnlockedIds(unlocked)
    setWalletBalance(wallet?.balance || 0)
    setLoading(false)
  }

  async function handleUnlock(opponent: AIOpponent) {
    if (!user || opponent.unlock_cost > walletBalance) return
    setUnlocking(opponent.id)

    const spent = await spendCoins(
      user.id,
      opponent.unlock_cost,
      'ai_opponent_unlock',
      `Unlocked AI opponent: ${opponent.name}`,
      opponent.id
    )

    if (spent) {
      await unlockAIOpponent(user.id, opponent.id)
      await loadData()
    }
    setUnlocking(null)
  }

  async function handleStartBattle() {
    if (!user || !selectedOpponent) return
    setStarting(true)

    const battle = await startAIBattle(user.id, selectedOpponent.id, 3)
    if (battle) {
      router.push(`/ai-battles/${battle.id}`)
    }
    setStarting(false)
  }

  const isUnlocked = (opponent: AIOpponent) => {
    return opponent.is_unlocked_by_default || unlockedIds.includes(opponent.id)
  }

  const difficultyColors = {
    beginner: 'from-green-500 to-green-600',
    intermediate: 'from-blue-500 to-blue-600',
    advanced: 'from-purple-500 to-purple-600',
    expert: 'from-orange-500 to-orange-600',
    legendary: 'from-red-500 to-pink-600'
  }

  const difficultyBadges = {
    beginner: 'bg-green-500/20 text-green-400',
    intermediate: 'bg-blue-500/20 text-blue-400',
    advanced: 'bg-purple-500/20 text-purple-400',
    expert: 'bg-orange-500/20 text-orange-400',
    legendary: 'bg-red-500/20 text-red-400'
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to battle AI opponents</h2>
          <p className="text-gray-400">Practice your skills against AI rappers of varying difficulties!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">AI Battle Arena</h1>
            <p className="text-gray-400">Practice against AI opponents and improve your skills</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Your Balance</div>
            <div className="text-2xl font-bold text-yellow-400">🪙 {walletBalance}</div>
          </div>
        </div>

        {/* Opponents Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {opponents.map((opponent, index) => {
              const unlocked = isUnlocked(opponent)

              return (
                <motion.div
                  key={opponent.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative overflow-hidden rounded-xl ${
                    unlocked ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => unlocked && setSelectedOpponent(opponent)}
                >
                  <div className={`p-6 bg-gradient-to-br ${difficultyColors[opponent.difficulty]} bg-opacity-20`}>
                    {/* Lock Overlay */}
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                        <span className="text-4xl mb-2">🔒</span>
                        <span className="font-bold">Locked</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnlock(opponent)
                          }}
                          disabled={unlocking === opponent.id || opponent.unlock_cost > walletBalance}
                          className="mt-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {unlocking === opponent.id ? 'Unlocking...' : `🪙 ${opponent.unlock_cost} to Unlock`}
                        </button>
                      </div>
                    )}

                    {/* Avatar */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${difficultyColors[opponent.difficulty]} flex items-center justify-center text-2xl font-bold`}>
                        {opponent.avatar_url ? (
                          <img src={opponent.avatar_url} alt={opponent.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          opponent.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{opponent.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${difficultyBadges[opponent.difficulty]}`}>
                          {opponent.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-300 text-sm mb-4">{opponent.description}</p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-400">Base ELO:</span>
                        <span className="ml-1 font-semibold">{opponent.base_elo}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Style:</span>
                        <span className="ml-1 font-semibold capitalize">{opponent.personality}</span>
                      </div>
                    </div>

                    {/* Style Traits */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {opponent.style_traits.slice(0, 3).map((trait, i) => (
                        <span key={i} className="px-2 py-0.5 bg-black/30 rounded text-xs">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Battle Modal */}
        {selectedOpponent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOpponent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${difficultyColors[selectedOpponent.difficulty]} flex items-center justify-center text-4xl font-bold mb-4`}>
                  {selectedOpponent.name.charAt(0)}
                </div>
                <h2 className="text-2xl font-bold">{selectedOpponent.name}</h2>
                <p className="text-gray-400 mt-2">{selectedOpponent.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-400">Difficulty</span>
                  <span className={`font-semibold capitalize ${difficultyBadges[selectedOpponent.difficulty].replace('bg-', 'text-').split(' ')[1]}`}>
                    {selectedOpponent.difficulty}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-400">Base ELO</span>
                  <span className="font-semibold">{selectedOpponent.base_elo}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-gray-400">Personality</span>
                  <span className="font-semibold capitalize">{selectedOpponent.personality}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedOpponent(null)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartBattle}
                  disabled={starting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {starting ? 'Starting...' : 'Start Battle'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
