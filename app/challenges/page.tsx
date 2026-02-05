'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/lib/store'
import {
  getActiveChallenges,
  getUserChallengeProgress,
  claimChallengeReward,
  Challenge,
  UserChallengeProgress
} from '@/lib/gamification'
import { recordDailyLogin, getLoginStreak, LoginStreak } from '@/lib/gamification'

export default function ChallengesPage() {
  const { user } = useUserStore()
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [progress, setProgress] = useState<UserChallengeProgress[]>([])
  const [loginStreak, setLoginStreak] = useState<LoginStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
    recordLogin()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const [dailyChallenges, weeklyChallenges, userProgress, streak] = await Promise.all([
      getActiveChallenges('daily'),
      getActiveChallenges('weekly'),
      getUserChallengeProgress(user.id),
      getLoginStreak(user.id)
    ])
    setChallenges([...dailyChallenges, ...weeklyChallenges])
    setProgress(userProgress)
    setLoginStreak(streak)
    setLoading(false)
  }

  async function recordLogin() {
    if (!user) return
    const result = await recordDailyLogin(user.id)
    if (result && result.coinsEarned > 0) {
      setLoginStreak(result.streak)
    }
  }

  async function handleClaimReward(progressId: string) {
    if (!user) return
    setClaiming(progressId)
    const success = await claimChallengeReward(user.id, progressId)
    if (success) {
      await loadData()
    }
    setClaiming(null)
  }

  const filteredChallenges = challenges.filter(c => c.type === activeTab)

  const getProgressForChallenge = (challengeId: string) => {
    return progress.find(p => p.challenge_id === challengeId)
  }

  const difficultyColors = {
    easy: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    hard: 'text-red-400 bg-red-500/20'
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to view challenges</h2>
          <p className="text-gray-400">Complete daily and weekly challenges to earn rewards!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Challenges</h1>
          <p className="text-gray-400">Complete challenges to earn coins and XP</p>
        </div>

        {/* Login Streak */}
        {loginStreak && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-xl bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Login Streak</h2>
                <p className="text-gray-400">Keep logging in daily for bonus rewards!</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-400">
                  {loginStreak.current_streak}
                </div>
                <div className="text-sm text-gray-400">Day Streak</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  className={`flex-1 h-2 rounded-full ${
                    day <= (loginStreak.current_streak % 7 || 7)
                      ? 'bg-orange-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
            {loginStreak.current_streak >= 7 && (
              <div className="mt-3 text-sm text-green-400">
                🎉 7-day streak bonus: 2x daily login coins!
              </div>
            )}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'daily'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Daily Challenges
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'weekly'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Weekly Challenges
          </button>
        </div>

        {/* Challenges List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredChallenges.map((challenge, index) => {
              const challengeProgress = getProgressForChallenge(challenge.id)
              const progressPercent = challengeProgress
                ? Math.min((challengeProgress.progress / challenge.requirement_value) * 100, 100)
                : 0
              const isCompleted = challengeProgress?.completed || false
              const isClaimed = challengeProgress?.claimed || false

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-6 rounded-xl ${
                    isClaimed
                      ? 'bg-gray-800/30 border border-gray-700'
                      : isCompleted
                      ? 'bg-green-900/20 border border-green-500/30'
                      : 'bg-gray-800/50 border border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{challenge.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${difficultyColors[challenge.difficulty]}`}>
                          {challenge.difficulty}
                        </span>
                        {isClaimed && (
                          <span className="px-2 py-0.5 bg-gray-600 text-gray-300 rounded text-xs">
                            Claimed
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400">{challenge.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400 font-bold">
                        🪙 {challenge.coin_reward}
                      </div>
                      <div className="text-sm text-gray-500">
                        +{challenge.xp_reward} XP
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className={isCompleted ? 'text-green-400' : 'text-gray-400'}>
                        {challengeProgress?.progress || 0} / {challenge.requirement_value}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        className={`h-full ${isCompleted ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                    </div>
                  </div>

                  {/* Claim Button */}
                  {isCompleted && !isClaimed && challengeProgress && (
                    <button
                      onClick={() => handleClaimReward(challengeProgress.id)}
                      disabled={claiming === challengeProgress.id}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {claiming === challengeProgress.id ? 'Claiming...' : 'Claim Reward'}
                    </button>
                  )}
                </motion.div>
              )
            })}

            {filteredChallenges.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No {activeTab} challenges available right now. Check back soon!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
