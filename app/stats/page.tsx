'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart3, Target,
  Flame, Zap, Music, Mic, Trophy, Calendar, Activity, Users, Swords
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  EloHistoryChart,
  WinRateTrendChart,
  SkillRadarChart,
  HeadToHeadChart,
  ScoreDistributionChart,
} from '@/components/analytics'

interface StatCategory {
  name: string
  score: number
  maxScore: number
  icon: React.ReactNode
  color: string
}

interface BattleStats {
  totalBattles: number
  wins: number
  losses: number
  winRate: number
  avgScore: number
  bestCategory: string
  worstCategory: string
  currentStreak: number
  bestStreak: number
  totalRounds: number
  avgRoundScore: number
  recentForm: ('W' | 'L')[]
  categoryScores: StatCategory[]
  monthlyStats: { month: string; wins: number; losses: number }[]
  eloHistory: { date: string; elo: number; change: number }[]
  winRateTrend: { period: string; winRate: number; battles: number }[]
  topOpponents: { opponent: string; wins: number; losses: number; avgScore: number }[]
  scoreDistribution: { range: string; count: number }[]
  radarData: { category: string; score: number; fullMark: number }[]
}

// Demo stats data
const DEMO_STATS: BattleStats = {
  totalBattles: 47,
  wins: 28,
  losses: 19,
  winRate: 59.6,
  avgScore: 7.4,
  bestCategory: 'Flow',
  worstCategory: 'Punchlines',
  currentStreak: 3,
  bestStreak: 7,
  totalRounds: 112,
  avgRoundScore: 7.2,
  recentForm: ['W', 'W', 'W', 'L', 'W', 'L', 'W', 'W', 'L', 'W'],
  categoryScores: [
    { name: 'Flow', score: 8.2, maxScore: 10, icon: <Activity className="w-5 h-5" />, color: 'fire' },
    { name: 'Rhymes', score: 7.6, maxScore: 10, icon: <Music className="w-5 h-5" />, color: 'purple' },
    { name: 'Punchlines', score: 6.8, maxScore: 10, icon: <Zap className="w-5 h-5" />, color: 'gold' },
    { name: 'Delivery', score: 7.4, maxScore: 10, icon: <Mic className="w-5 h-5" />, color: 'ice' },
  ],
  monthlyStats: [
    { month: 'Jul', wins: 4, losses: 2 },
    { month: 'Aug', wins: 5, losses: 3 },
    { month: 'Sep', wins: 6, losses: 4 },
    { month: 'Oct', wins: 7, losses: 5 },
    { month: 'Nov', wins: 6, losses: 5 },
  ],
  eloHistory: [
    { date: 'Jun', elo: 1000, change: 0 },
    { date: 'Jul', elo: 1045, change: 45 },
    { date: 'Aug', elo: 1082, change: 37 },
    { date: 'Sep', elo: 1120, change: 38 },
    { date: 'Oct', elo: 1156, change: 36 },
    { date: 'Nov', elo: 1178, change: 22 },
  ],
  winRateTrend: [
    { period: 'Week 1', winRate: 50, battles: 4 },
    { period: 'Week 2', winRate: 60, battles: 5 },
    { period: 'Week 3', winRate: 55, battles: 4 },
    { period: 'Week 4', winRate: 67, battles: 6 },
    { period: 'Week 5', winRate: 62, battles: 5 },
    { period: 'Week 6', winRate: 71, battles: 7 },
  ],
  topOpponents: [
    { opponent: 'MC_Thunder', wins: 3, losses: 1, avgScore: 7.8 },
    { opponent: 'FlowMaster', wins: 2, losses: 2, avgScore: 7.2 },
    { opponent: 'RhymeKing', wins: 2, losses: 1, avgScore: 7.5 },
    { opponent: 'BeatDropper', wins: 1, losses: 2, avgScore: 6.9 },
  ],
  scoreDistribution: [
    { range: '5-6', count: 8 },
    { range: '6-7', count: 15 },
    { range: '7-8', count: 28 },
    { range: '8-9', count: 12 },
    { range: '9-10', count: 3 },
  ],
  radarData: [
    { category: 'Flow', score: 8.2, fullMark: 10 },
    { category: 'Rhymes', score: 7.6, fullMark: 10 },
    { category: 'Punchlines', score: 6.8, fullMark: 10 },
    { category: 'Delivery', score: 7.4, fullMark: 10 },
    { category: 'Creativity', score: 7.1, fullMark: 10 },
    { category: 'Rebuttal', score: 6.5, fullMark: 10 },
  ],
}

function getColorClasses(color: string) {
  switch (color) {
    case 'fire': return { bg: 'bg-fire-500/20', text: 'text-fire-400', bar: 'bg-fire-500' }
    case 'ice': return { bg: 'bg-ice-500/20', text: 'text-ice-400', bar: 'bg-ice-500' }
    case 'gold': return { bg: 'bg-gold-500/20', text: 'text-gold-400', bar: 'bg-gold-500' }
    case 'purple': return { bg: 'bg-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500' }
    default: return { bg: 'bg-dark-700', text: 'text-dark-400', bar: 'bg-dark-500' }
  }
}

export default function StatsPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const [stats, setStats] = useState<BattleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('all')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadStats()
  }, [user, router])

  async function loadStats() {
    // In production, fetch from API
    setStats(DEMO_STATS)
    setLoading(false)
  }

  if (!user) return null

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const maxMonthlyBattles = Math.max(...stats.monthlyStats.map(m => m.wins + m.losses))

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-fire-900/10 via-dark-950 to-purple-900/10" />

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
              <BarChart3 className="w-8 h-8 text-fire-400" />
              Battle Stats
            </h1>
            <p className="text-dark-400 mt-1">Your performance breakdown</p>
          </div>

          {/* Time Range Filter */}
          <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
            {(['week', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm capitalize transition-colors",
                  timeRange === range
                    ? "bg-fire-500 text-white"
                    : "text-dark-400 hover:text-white"
                )}
              >
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center"
          >
            <div className="text-3xl font-bold text-fire-400">{stats.wins}</div>
            <div className="text-sm text-dark-400">Wins</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card text-center"
          >
            <div className="text-3xl font-bold text-ice-400">{stats.losses}</div>
            <div className="text-sm text-dark-400">Losses</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card text-center"
          >
            <div className="text-3xl font-bold text-gold-400">{stats.winRate}%</div>
            <div className="text-sm text-dark-400">Win Rate</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card text-center"
          >
            <div className="text-3xl font-bold text-purple-400">{stats.avgScore}</div>
            <div className="text-sm text-dark-400">Avg Score</div>
          </motion.div>
        </div>

        {/* Recent Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mb-6"
        >
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Recent Form
          </h3>
          <div className="flex gap-2">
            {stats.recentForm.map((result, index) => (
              <div
                key={index}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                  result === 'W'
                    ? "bg-green-500/20 text-green-400"
                    : "bg-fire-500/20 text-fire-400"
                )}
              >
                {result}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-fire-400" />
              <span className="text-dark-400">Current Streak:</span>
              <span className="font-bold text-fire-400">{stats.currentStreak}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold-400" />
              <span className="text-dark-400">Best Streak:</span>
              <span className="font-bold text-gold-400">{stats.bestStreak}</span>
            </div>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card mb-6"
        >
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Category Performance
          </h3>
          <div className="space-y-4">
            {stats.categoryScores.map((category, index) => {
              const colors = getColorClasses(category.color)
              const percentage = (category.score / category.maxScore) * 100

              return (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-2 rounded-lg", colors.bg, colors.text)}>
                        {category.icon}
                      </div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <span className={cn("font-bold", colors.text)}>
                      {category.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.4 + index * 0.05 }}
                      className={cn("h-full rounded-full", colors.bar)}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-dark-700">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-sm text-dark-400">Best Category</div>
                <div className="font-bold text-green-400">{stats.bestCategory}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-fire-400" />
              <div>
                <div className="text-sm text-dark-400">Needs Work</div>
                <div className="font-bold text-fire-400">{stats.worstCategory}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Monthly Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card mb-6"
        >
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-ice-400" />
            Monthly Activity
          </h3>
          <div className="flex items-end gap-3 h-40">
            {stats.monthlyStats.map((month, index) => {
              const total = month.wins + month.losses
              const height = (total / maxMonthlyBattles) * 100
              const winHeight = total > 0 ? (month.wins / total) * 100 : 0

              return (
                <div key={month.month} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full relative rounded-t-lg overflow-hidden"
                    style={{ height: `${height}%` }}
                  >
                    <div
                      className="absolute bottom-0 w-full bg-fire-500/50"
                      style={{ height: `${100 - winHeight}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full bg-green-500"
                      style={{ height: `${winHeight}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-dark-400">{month.month}</div>
                  <div className="text-xs">
                    <span className="text-green-400">{month.wins}</span>
                    <span className="text-dark-500">/</span>
                    <span className="text-fire-400">{month.losses}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-dark-400">Wins</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-fire-500/50 rounded" />
              <span className="text-dark-400">Losses</span>
            </div>
          </div>
        </motion.div>

        {/* ELO History & Win Rate Trend */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-fire-400" />
              ELO Rating History
            </h3>
            <div className="text-2xl font-bold text-fire-400 mb-2">
              {stats.eloHistory[stats.eloHistory.length - 1]?.elo || 1000}
              <span className="text-sm text-green-400 ml-2">
                +{stats.eloHistory.reduce((sum, e) => sum + e.change, 0)}
              </span>
            </div>
            <EloHistoryChart data={stats.eloHistory} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="card"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Win Rate Trend
            </h3>
            <div className="text-2xl font-bold text-green-400 mb-2">
              {stats.winRateTrend[stats.winRateTrend.length - 1]?.winRate.toFixed(1) || 0}%
              <span className="text-sm text-dark-400 ml-2">this week</span>
            </div>
            <WinRateTrendChart data={stats.winRateTrend} />
          </motion.div>
        </div>

        {/* Skill Radar & Head-to-Head */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Skill Breakdown
            </h3>
            <SkillRadarChart data={stats.radarData} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="card"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5 text-ice-400" />
              Top Matchups
            </h3>
            <HeadToHeadChart data={stats.topOpponents} />
          </motion.div>
        </div>

        {/* Score Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card mb-6"
        >
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Score Distribution
          </h3>
          <p className="text-sm text-dark-400 mb-4">
            Your round scores across all battles
          </p>
          <ScoreDistributionChart data={stats.scoreDistribution} />
        </motion.div>

        {/* Additional Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.totalRounds}</div>
            <div className="text-sm text-dark-400">Total Rounds</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-ice-400">{stats.avgRoundScore}</div>
            <div className="text-sm text-dark-400">Avg Round Score</div>
          </div>
          <div className="card text-center col-span-2 md:col-span-1">
            <div className="text-2xl font-bold text-gold-400">{stats.totalBattles}</div>
            <div className="text-sm text-dark-400">Total Battles</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
