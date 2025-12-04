'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Award, Lock, Trophy, Star, Flame, Zap } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Achievement,
  AchievementType,
  ACHIEVEMENT_INFO,
  getUserAchievements
} from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Demo achievements
const DEMO_ACHIEVEMENTS: Achievement[] = [
  { id: '1', user_id: 'demo', achievement_type: 'first_battle', unlocked_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: '2', user_id: 'demo', achievement_type: 'first_win', unlocked_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: '3', user_id: 'demo', achievement_type: 'battles_10', unlocked_at: new Date(Date.now() - 86400000 * 2).toISOString() },
]

const RARITY_COLORS = {
  common: { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400', glow: '' },
  rare: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  epic: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', glow: 'shadow-purple-500/30' },
  legendary: { bg: 'bg-gold-500/20', border: 'border-gold-500/50', text: 'text-gold-400', glow: 'shadow-gold-500/40' },
}

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'] as const

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AchievementsPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadAchievements()
  }, [user, router])

  async function loadAchievements() {
    setLoading(false)
    if (isDemo) {
      setAchievements(DEMO_ACHIEVEMENTS)
    } else {
      const data = await getUserAchievements(user!.id)
      setAchievements(data)
    }
  }

  const unlockedTypes = new Set(achievements.map(a => a.achievement_type))
  const allAchievementTypes = Object.keys(ACHIEVEMENT_INFO) as AchievementType[]

  // Sort by rarity
  const sortedTypes = [...allAchievementTypes].sort((a, b) => {
    const rarityA = RARITY_ORDER.indexOf(ACHIEVEMENT_INFO[a].rarity)
    const rarityB = RARITY_ORDER.indexOf(ACHIEVEMENT_INFO[b].rarity)
    return rarityA - rarityB
  })

  const filteredTypes = sortedTypes.filter(type => {
    if (filter === 'unlocked') return unlockedTypes.has(type)
    if (filter === 'locked') return !unlockedTypes.has(type)
    return true
  })

  const stats = {
    total: allAchievementTypes.length,
    unlocked: unlockedTypes.size,
    common: allAchievementTypes.filter(t => ACHIEVEMENT_INFO[t].rarity === 'common' && unlockedTypes.has(t)).length,
    rare: allAchievementTypes.filter(t => ACHIEVEMENT_INFO[t].rarity === 'rare' && unlockedTypes.has(t)).length,
    epic: allAchievementTypes.filter(t => ACHIEVEMENT_INFO[t].rarity === 'epic' && unlockedTypes.has(t)).length,
    legendary: allAchievementTypes.filter(t => ACHIEVEMENT_INFO[t].rarity === 'legendary' && unlockedTypes.has(t)).length,
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-900/10 via-dark-950 to-purple-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Award className="w-8 h-8 text-gold-400" />
              Achievements
            </h1>
            <p className="text-dark-400 mt-1">
              {stats.unlocked} of {stats.total} unlocked
            </p>
          </div>
        </div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Progress</h2>
            <span className="text-2xl font-bold text-gold-400">
              {Math.round((stats.unlocked / stats.total) * 100)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-dark-700 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-gold-500 to-gold-400"
            />
          </div>

          {/* Rarity breakdown */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-gray-500/10">
              <div className="text-xl font-bold text-gray-400">{stats.common}</div>
              <div className="text-xs text-dark-400">Common</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <div className="text-xl font-bold text-blue-400">{stats.rare}</div>
              <div className="text-xs text-dark-400">Rare</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-500/10">
              <div className="text-xl font-bold text-purple-400">{stats.epic}</div>
              <div className="text-xs text-dark-400">Epic</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gold-500/10">
              <div className="text-xl font-bold text-gold-400">{stats.legendary}</div>
              <div className="text-xs text-dark-400">Legendary</div>
            </div>
          </div>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg capitalize transition-colors",
                filter === f
                  ? "bg-gold-500 text-dark-950"
                  : "bg-dark-800 text-dark-400 hover:text-white"
              )}
            >
              {f} {f === 'unlocked' && `(${stats.unlocked})`}
              {f === 'locked' && `(${stats.total - stats.unlocked})`}
            </button>
          ))}
        </div>

        {/* Achievements grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredTypes.map((type, index) => {
            const info = ACHIEVEMENT_INFO[type]
            const unlocked = unlockedTypes.has(type)
            const achievement = achievements.find(a => a.achievement_type === type)
            const colors = RARITY_COLORS[info.rarity]

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative p-4 rounded-xl border transition-all",
                  unlocked
                    ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
                    : "bg-dark-800/50 border-dark-700"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center text-2xl",
                    unlocked ? colors.bg : "bg-dark-700"
                  )}>
                    {unlocked ? info.icon : <Lock className="w-6 h-6 text-dark-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "font-bold",
                        unlocked ? "text-white" : "text-dark-400"
                      )}>
                        {info.name}
                      </h3>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full capitalize",
                        colors.bg, colors.text
                      )}>
                        {info.rarity}
                      </span>
                    </div>

                    <p className={cn(
                      "text-sm",
                      unlocked ? "text-dark-300" : "text-dark-500"
                    )}>
                      {info.description}
                    </p>

                    {unlocked && achievement && (
                      <p className="text-xs text-dark-500 mt-2">
                        Unlocked {formatDate(achievement.unlocked_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shine effect for legendary */}
                {unlocked && info.rarity === 'legendary' && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-400/10 to-transparent animate-shimmer" />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {filteredTypes.length === 0 && (
          <div className="card text-center py-12">
            <Award className="w-16 h-16 mx-auto mb-4 text-dark-600" />
            <h3 className="text-xl font-bold mb-2">No Achievements Found</h3>
            <p className="text-dark-400">
              {filter === 'unlocked'
                ? "You haven't unlocked any achievements yet. Start battling!"
                : "You've unlocked all achievements! Impressive!"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
