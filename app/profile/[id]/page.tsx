'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Trophy, Swords, TrendingUp, Calendar,
  Crown, Target, Flame, Clock, ChevronRight, Award
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { Profile, Battle, getProfile, getRecentBattles, Achievement, ACHIEVEMENT_INFO, getUserAchievements } from '@/lib/supabase'
import { getAvatarUrl, formatElo, getEloRank, getWinRate, formatDate, cn } from '@/lib/utils'

export default function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const profileId = params.id as string

  const { user, isDemo } = useUserStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [battles, setBattles] = useState<Battle[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'battles' | 'achievements'>('overview')

  const isOwnProfile = user?.id === profileId

  // Demo achievements
  const DEMO_ACHIEVEMENTS: Achievement[] = [
    { id: '1', user_id: profileId, achievement_type: 'first_battle', unlocked_at: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: '2', user_id: profileId, achievement_type: 'first_win', unlocked_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: '3', user_id: profileId, achievement_type: 'battles_10', unlocked_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  ]

  useEffect(() => {
    loadProfile()
  }, [profileId])

  async function loadProfile() {
    setLoading(true)

    const [profileData, battlesData] = await Promise.all([
      getProfile(profileId),
      getRecentBattles(profileId, 20)
    ])

    setProfile(profileData)
    setBattles(battlesData)

    // Load achievements
    if (isDemo) {
      setAchievements(DEMO_ACHIEVEMENTS)
    } else {
      const achievementsData = await getUserAchievements(profileId)
      setAchievements(achievementsData)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <button onClick={() => router.back()} className="btn-dark">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const rank = getEloRank(profile.elo_rating)
  const winRate = getWinRate(profile.wins, profile.losses)

  // Calculate stats
  const totalBattles = profile.total_battles
  const winStreak = calculateWinStreak(battles, profileId)
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  function calculateWinStreak(battles: Battle[], oderId: string): number {
    let streak = 0
    for (const battle of battles) {
      if (battle.winner_id === oderId) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-fire-900/10 via-dark-950 to-purple-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={getAvatarUrl(profile.username, profile.avatar_url)}
                alt={profile.username}
                className="w-32 h-32 rounded-full border-4 border-dark-600"
              />
              {rank.name === 'Legend' && (
                <div className="absolute -top-2 -right-2">
                  <Crown className="w-8 h-8 text-gold-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">
                {profile.username}
                {isOwnProfile && (
                  <span className="ml-3 text-sm bg-fire-500/20 text-fire-400 px-2 py-1 rounded-full">
                    You
                  </span>
                )}
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <span className={cn("text-xl font-medium", rank.color)}>
                  {rank.icon} {rank.name}
                </span>
                <span className="text-dark-500">•</span>
                <span className="text-dark-400">{formatElo(profile.elo_rating)} ELO</span>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-dark-400">
                <Calendar className="w-4 h-4" />
                Member since {memberSince}
              </div>
            </div>

            {/* Win Rate Circle */}
            <div className="text-center">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-dark-700"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${winRate * 3.02} 302`}
                    className="text-fire-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div>
                    <div className="text-2xl font-bold">{winRate}%</div>
                    <div className="text-xs text-dark-400">Win Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="card text-center">
            <div className="w-12 h-12 bg-fire-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-fire-400" />
            </div>
            <div className="text-2xl font-bold text-fire-400">{profile.wins}</div>
            <div className="text-sm text-dark-400">Victories</div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-ice-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-ice-400" />
            </div>
            <div className="text-2xl font-bold text-ice-400">{profile.losses}</div>
            <div className="text-sm text-dark-400">Defeats</div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Swords className="w-6 h-6 text-gold-400" />
            </div>
            <div className="text-2xl font-bold text-gold-400">{totalBattles}</div>
            <div className="text-sm text-dark-400">Total Battles</div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Flame className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{winStreak}</div>
            <div className="text-sm text-dark-400">Win Streak</div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all",
              activeTab === 'overview'
                ? 'bg-fire-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('battles')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all",
              activeTab === 'battles'
                ? 'bg-fire-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            Battle History
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
              activeTab === 'achievements'
                ? 'bg-fire-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Award className="w-4 h-4" />
            Achievements ({achievements.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Recent Performance */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Recent Performance
              </h3>

              {battles.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {battles.slice(0, 10).map((battle) => {
                    const won = battle.winner_id === profileId
                    return (
                      <div
                        key={battle.id}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                          won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        )}
                        title={`${won ? 'Won' : 'Lost'} vs ${
                          battle.player1_id === profileId
                            ? battle.player2?.username
                            : battle.player1?.username
                        }`}
                      >
                        {won ? 'W' : 'L'}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-dark-400">No battles yet</p>
              )}
            </div>

            {/* ELO Progress */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4">ELO Rating</h3>
              <div className="flex items-end gap-4">
                <div className="text-4xl font-bold gradient-text-fire">
                  {formatElo(profile.elo_rating)}
                </div>
                <div className="text-dark-400 pb-1">
                  {rank.icon} {rank.name} Rank
                </div>
              </div>

              {/* Rank Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-dark-400 mb-2">
                  <span>{rank.name}</span>
                  <span>Next: {getNextRank(profile.elo_rating)}</span>
                </div>
                <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fire-500 to-fire-400 rounded-full"
                    style={{ width: `${getRankProgress(profile.elo_rating)}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'battles' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-ice-400" />
              Battle History
            </h3>

            {battles.length > 0 ? (
              <div className="space-y-3">
                {battles.map((battle) => {
                  const isPlayer1 = battle.player1_id === profileId
                  const opponent = isPlayer1 ? battle.player2 : battle.player1
                  const won = battle.winner_id === profileId
                  const myScore = isPlayer1 ? battle.player1_total_score : battle.player2_total_score
                  const theirScore = isPlayer1 ? battle.player2_total_score : battle.player1_total_score

                  return (
                    <div
                      key={battle.id}
                      onClick={() => opponent && router.push(`/profile/${opponent.id}`)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02]",
                        won
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-xl",
                        won ? 'bg-green-500/20' : 'bg-red-500/20'
                      )}>
                        {won ? '🏆' : '💀'}
                      </div>

                      <img
                        src={getAvatarUrl(opponent?.username || 'Unknown', opponent?.avatar_url)}
                        alt={opponent?.username || 'Unknown'}
                        className="w-12 h-12 rounded-full border-2 border-dark-600"
                      />

                      <div className="flex-1">
                        <p className="font-bold">vs {opponent?.username || 'Unknown'}</p>
                        <p className="text-sm text-dark-400">
                          {formatDate(battle.completed_at || battle.created_at)}
                          {' • '}
                          {battle.total_rounds} round{battle.total_rounds > 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={cn(
                          "font-bold text-lg",
                          won ? 'text-green-400' : 'text-red-400'
                        )}>
                          {won ? 'VICTORY' : 'DEFEAT'}
                        </span>
                        {myScore !== null && theirScore !== null && (
                          <p className="text-sm text-dark-400">
                            {myScore.toFixed(1)} - {theirScore.toFixed(1)}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-dark-500" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-dark-400">
                <Swords className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No battles yet</p>
                <p className="text-sm">This rapper hasn't competed in any battles</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'achievements' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {achievements.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => {
                  const info = ACHIEVEMENT_INFO[achievement.achievement_type]
                  if (!info) return null

                  const rarityColors = {
                    common: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
                    rare: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
                    epic: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
                    legendary: 'bg-gold-500/20 border-gold-500/50 text-gold-400',
                  }

                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "p-4 rounded-xl border",
                        rarityColors[info.rarity]
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-2xl">
                          {info.icon}
                        </div>
                        <div>
                          <h4 className="font-bold">{info.name}</h4>
                          <p className="text-sm text-dark-400">{info.description}</p>
                          <p className="text-xs text-dark-500 mt-1">
                            Unlocked {formatDate(achievement.unlocked_at)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="card text-center py-12">
                <Award className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                <p className="text-lg text-dark-400">No achievements yet</p>
                <p className="text-sm text-dark-500">Start battling to earn badges!</p>
              </div>
            )}

            {isOwnProfile && (
              <button
                onClick={() => router.push('/achievements')}
                className="w-full btn-dark flex items-center justify-center gap-2"
              >
                <Award className="w-5 h-5" />
                View All Achievements
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function getNextRank(elo: number): string {
  if (elo >= 2000) return 'Max Rank!'
  if (elo >= 1800) return 'Legend (2000)'
  if (elo >= 1600) return 'Master (1800)'
  if (elo >= 1400) return 'Diamond (1600)'
  if (elo >= 1200) return 'Platinum (1400)'
  if (elo >= 1000) return 'Gold (1200)'
  if (elo >= 800) return 'Silver (1000)'
  return 'Bronze (800)'
}

function getRankProgress(elo: number): number {
  const thresholds = [0, 800, 1000, 1200, 1400, 1600, 1800, 2000]

  for (let i = 0; i < thresholds.length - 1; i++) {
    if (elo < thresholds[i + 1]) {
      const min = thresholds[i]
      const max = thresholds[i + 1]
      return ((elo - min) / (max - min)) * 100
    }
  }
  return 100
}
