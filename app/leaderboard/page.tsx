'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trophy, Medal, Crown, TrendingUp, Swords, ArrowLeft } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { getLeaderboard, Profile, LeaderboardTimeframe } from '@/lib/supabase'
import { getAvatarUrl, getEloRank, formatElo, cn } from '@/lib/utils'

export default function LeaderboardPage() {
  const router = useRouter()
  const { user } = useUserStore()
  const [players, setPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all')

  useEffect(() => {
    loadLeaderboard()
  }, [timeframe])

  async function loadLeaderboard() {
    setLoading(true)
    const data = await getLeaderboard(50, timeframe)
    setPlayers(data)
    setLoading(false)
  }

  function getWinRate(wins: number, losses: number): number {
    const total = wins + losses
    if (total === 0) return 0
    return Math.round((wins / total) * 100)
  }

  function getRankIcon(index: number) {
    if (index === 0) return <Crown className="w-6 h-6 text-gold-400" />
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300" />
    if (index === 2) return <Medal className="w-6 h-6 text-orange-400" />
    return <span className="w-6 h-6 flex items-center justify-center text-dark-400 font-bold">{index + 1}</span>
  }

  function getRankStyle(index: number) {
    if (index === 0) return 'bg-gradient-to-r from-gold-500/20 to-gold-600/10 border-gold-500/30'
    if (index === 1) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30'
    if (index === 2) return 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 border-orange-500/30'
    return 'bg-dark-800/50 border-dark-700'
  }

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
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-gold-400" />
              Leaderboard
            </h1>
            <p className="text-dark-400 mt-1">Top ranked battle rappers</p>
          </div>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: 'all', label: 'All Time' },
            { id: 'month', label: 'This Month' },
            { id: 'week', label: 'This Week' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all",
                timeframe === tab.id
                  ? 'bg-gold-500 text-black'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {!loading && players.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="relative">
                <img
                  src={getAvatarUrl(players[1].username, players[1].avatar_url)}
                  alt={players[1].username}
                  className="w-20 h-20 rounded-full border-4 border-gray-400 mx-auto"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-400 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  2
                </div>
              </div>
              <p className="font-bold mt-4">{players[1].username}</p>
              <p className="text-sm text-gray-400">{formatElo(players[1].elo_rating)} ELO</p>
              <div className="h-24 w-24 bg-gray-400/20 rounded-t-lg mt-2 flex items-center justify-center">
                <Medal className="w-8 h-8 text-gray-400" />
              </div>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Crown className="w-10 h-10 text-gold-400" />
                </div>
                <img
                  src={getAvatarUrl(players[0].username, players[0].avatar_url)}
                  alt={players[0].username}
                  className="w-24 h-24 rounded-full border-4 border-gold-400 mx-auto glow-gold"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gold-400 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
              </div>
              <p className="font-bold text-lg mt-4">{players[0].username}</p>
              <p className="text-sm text-gold-400">{formatElo(players[0].elo_rating)} ELO</p>
              <div className="h-32 w-28 bg-gold-400/20 rounded-t-lg mt-2 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-gold-400" />
              </div>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="relative">
                <img
                  src={getAvatarUrl(players[2].username, players[2].avatar_url)}
                  alt={players[2].username}
                  className="w-20 h-20 rounded-full border-4 border-orange-400 mx-auto"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-400 text-black w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  3
                </div>
              </div>
              <p className="font-bold mt-4">{players[2].username}</p>
              <p className="text-sm text-orange-400">{formatElo(players[2].elo_rating)} ELO</p>
              <div className="h-16 w-24 bg-orange-400/20 rounded-t-lg mt-2 flex items-center justify-center">
                <Medal className="w-8 h-8 text-orange-400" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Full Leaderboard List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Rankings</h2>
            <div className="text-sm text-dark-400">
              {players.length} rappers
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player, index) => {
                const rank = getEloRank(player.elo_rating)
                const isCurrentUser = user?.id === player.id

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => router.push(`/profile/${player.id}`)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02]",
                      getRankStyle(index),
                      isCurrentUser && 'ring-2 ring-fire-500'
                    )}
                  >
                    {/* Rank */}
                    <div className="w-8 flex justify-center">
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar */}
                    <img
                      src={getAvatarUrl(player.username, player.avatar_url)}
                      alt={player.username}
                      className="w-12 h-12 rounded-full border-2 border-dark-600"
                    />

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{player.username}</span>
                        {isCurrentUser && (
                          <span className="text-xs bg-fire-500/20 text-fire-400 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                        <span className={cn("text-sm", rank.color)}>
                          {rank.icon} {rank.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-dark-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Swords className="w-3 h-3" />
                          {player.total_battles} battles
                        </span>
                        <span className="text-green-400">{player.wins}W</span>
                        <span className="text-red-400">{player.losses}L</span>
                        <span>{getWinRate(player.wins, player.losses)}% WR</span>
                      </div>
                    </div>

                    {/* ELO */}
                    <div className="text-right">
                      <div className="text-xl font-bold">{formatElo(player.elo_rating)}</div>
                      <div className="text-xs text-dark-400">ELO</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
