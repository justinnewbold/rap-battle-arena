'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Filter, Trophy, Swords, ChevronRight } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { supabase, Battle, Profile } from '@/lib/supabase'
import { getAvatarUrl, formatElo, getEloRank, formatDate, cn } from '@/lib/utils'

type FilterType = 'all' | 'wins' | 'losses'

export default function HistoryPage() {
  const router = useRouter()
  const { user } = useUserStore()
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadBattles()
  }, [user, router])

  async function loadBattles() {
    if (!user) return

    setLoading(true)

    const { data, error } = await supabase
      .from('battles')
      .select(`
        *,
        player1:profiles!battles_player1_id_fkey(id, username, avatar_url, elo_rating),
        player2:profiles!battles_player2_id_fkey(id, username, avatar_url, elo_rating)
      `)
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'complete')
      .order('completed_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setBattles(data)
    }
    setLoading(false)
  }

  const filteredBattles = battles.filter(battle => {
    if (filter === 'all') return true
    const won = battle.winner_id === user?.id
    return filter === 'wins' ? won : !won
  })

  const stats = {
    total: battles.length,
    wins: battles.filter(b => b.winner_id === user?.id).length,
    losses: battles.filter(b => b.winner_id !== user?.id).length
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-ice-900/10 via-dark-950 to-fire-900/10" />

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
              <Clock className="w-8 h-8 text-ice-400" />
              Battle History
            </h1>
            <p className="text-dark-400 mt-1">Your complete battle record</p>
          </div>
        </div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          <div className="card text-center">
            <div className="text-3xl font-bold text-gold-400">{stats.total}</div>
            <div className="text-sm text-dark-400">Total Battles</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
            <div className="text-sm text-dark-400">Victories</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
            <div className="text-sm text-dark-400">Defeats</div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'all', label: 'All Battles', count: stats.total },
            { id: 'wins', label: 'Victories', count: stats.wins },
            { id: 'losses', label: 'Defeats', count: stats.losses },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as FilterType)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
                filter === tab.id
                  ? 'bg-ice-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              )}
            >
              {tab.label}
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                filter === tab.id ? 'bg-white/20' : 'bg-dark-600'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Battle List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-ice-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBattles.length > 0 ? (
            <div className="space-y-3">
              {filteredBattles.map((battle, index) => {
                const isPlayer1 = battle.player1_id === user.id
                const opponent = isPlayer1 ? battle.player2 : battle.player1
                const won = battle.winner_id === user.id
                const myScore = isPlayer1 ? battle.player1_total_score : battle.player2_total_score
                const theirScore = isPlayer1 ? battle.player2_total_score : battle.player1_total_score

                return (
                  <motion.div
                    key={battle.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => opponent && router.push(`/profile/${opponent.id}`)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]",
                      won
                        ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/15'
                        : 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/15'
                    )}
                  >
                    {/* Result Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0",
                      won ? 'bg-green-500/20' : 'bg-red-500/20'
                    )}>
                      {won ? '🏆' : '💀'}
                    </div>

                    {/* Opponent Avatar */}
                    <img
                      src={getAvatarUrl(opponent?.username || 'Unknown', opponent?.avatar_url)}
                      alt={opponent?.username || 'Unknown'}
                      className="w-12 h-12 rounded-full border-2 border-dark-600 shrink-0"
                    />

                    {/* Battle Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">vs {opponent?.username || 'Unknown'}</p>
                      <div className="flex items-center gap-2 text-sm text-dark-400">
                        <span>{formatDate(battle.completed_at || battle.created_at)}</span>
                        <span>•</span>
                        <span>{battle.total_rounds} round{battle.total_rounds > 1 ? 's' : ''}</span>
                        {opponent && (
                          <>
                            <span>•</span>
                            <span className={getEloRank(opponent.elo_rating).color}>
                              {formatElo(opponent.elo_rating)} ELO
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <span className={cn(
                        "font-bold text-lg",
                        won ? 'text-green-400' : 'text-red-400'
                      )}>
                        {won ? 'WIN' : 'LOSS'}
                      </span>
                      {myScore !== null && theirScore !== null && (
                        <p className="text-sm text-dark-400">
                          {myScore.toFixed(1)} - {theirScore.toFixed(1)}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-dark-500 shrink-0" />
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-dark-400">
              <Swords className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No battles found</p>
              <p className="text-sm">
                {filter === 'all'
                  ? "You haven't competed in any battles yet"
                  : `No ${filter === 'wins' ? 'victories' : 'defeats'} to show`
                }
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-fire mt-4"
                >
                  Start Your First Battle
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
