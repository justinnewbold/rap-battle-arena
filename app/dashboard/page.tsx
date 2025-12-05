'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Mic2, Trophy, Swords, User, LogOut, TrendingUp,
  Target, Flame, Clock, ChevronRight, Users, Zap,
  Play, UserPlus, Hash, Bell, Settings, Award, Dumbbell,
  Search, BarChart3
} from 'lucide-react'
import { useUserStore, useBattleStore, useTutorialStore, DEMO_USER } from '@/lib/store'
import { supabase, getLeaderboard, getRecentBattles, Profile, Battle } from '@/lib/supabase'
import { getAvatarUrl, formatElo, getEloRank, getWinRate, formatDate, generateRoomCode } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isDemo, setUser, logout } = useUserStore()
  const { setCurrentBattle, resetBattle } = useBattleStore()
  const { hasCompletedTutorial } = useTutorialStore()
  const [leaderboard, setLeaderboard] = useState<Profile[]>([])
  const [recentBattles, setRecentBattles] = useState<Battle[]>([])
  const [activeTab, setActiveTab] = useState<'home' | 'battle' | 'profile'>('home')
  const [joinCode, setJoinCode] = useState('')
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    // Redirect new users to onboarding
    if (!hasCompletedTutorial && user.total_battles === 0) {
      router.push('/onboarding')
      return
    }
    loadData()
  }, [user, router, hasCompletedTutorial])

  async function loadData() {
    const [leaders, battles] = await Promise.all([
      getLeaderboard(10),
      user ? getRecentBattles(user.id, 5) : []
    ])
    setLeaderboard(leaders)
    setRecentBattles(battles)
  }

  async function handleLogout() {
    if (!isDemo) {
      await supabase.auth.signOut()
    }
    logout()
    router.push('/')
  }

  function handleQuickMatch() {
    router.push('/matchmaking')
  }

  function handleCreateRoom() {
    const code = generateRoomCode()
    router.push(`/battle/create?code=${code}`)
  }

  function handleJoinRoom() {
    if (joinCode.length >= 4) {
      router.push(`/battle/join?code=${joinCode.toUpperCase()}`)
    }
  }

  if (!user) return null

  const rank = getEloRank(user.elo_rating)
  const winRate = getWinRate(user.wins, user.losses)

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="bg-dark-900/80 backdrop-blur-lg border-b border-dark-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-fire-500 to-fire-600 rounded-xl flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display tracking-wider">
              <span className="gradient-text-fire">RAP BATTLE</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="bg-gold-500/20 text-gold-400 text-xs font-medium px-2 py-1 rounded-full">
                DEMO MODE
              </span>
            )}
            <button
              onClick={() => router.push('/search')}
              className="text-dark-400 hover:text-white transition-colors p-2"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/notifications')}
              className="relative text-dark-400 hover:text-white transition-colors p-2"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-fire-500 rounded-full" />
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="text-dark-400 hover:text-white transition-colors p-2"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="text-dark-400 hover:text-white transition-colors p-2"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* User Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <img
              src={getAvatarUrl(user.username, user.avatar_url)}
              alt={user.username}
              className="w-16 h-16 rounded-full bg-dark-700"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <div className="flex items-center gap-2">
                <span className={`${rank.color} font-medium`}>
                  {rank.icon} {rank.name}
                </span>
                <span className="text-dark-500">•</span>
                <span className="text-dark-400">{formatElo(user.elo_rating)} ELO</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display gradient-text-gold">{winRate}%</div>
              <div className="text-sm text-dark-400">Win Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-fire-400">{user.wins}</div>
              <div className="text-sm text-dark-400">Wins</div>
            </div>
            <div className="bg-dark-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-ice-400">{user.losses}</div>
              <div className="text-sm text-dark-400">Losses</div>
            </div>
            <div className="bg-dark-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gold-400">{user.total_battles}</div>
              <div className="text-sm text-dark-400">Total Battles</div>
            </div>
          </div>
        </motion.div>

        {/* Battle Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <button
            onClick={handleQuickMatch}
            className="card-hover flex flex-col items-center justify-center py-8 group"
          >
            <div className="w-16 h-16 bg-fire-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-fire-500/30 transition-colors">
              <Zap className="w-8 h-8 text-fire-400" />
            </div>
            <h3 className="text-lg font-bold mb-1">Quick Match</h3>
            <p className="text-sm text-dark-400">Find an opponent</p>
          </button>

          <button
            onClick={handleCreateRoom}
            className="card-hover flex flex-col items-center justify-center py-8 group"
          >
            <div className="w-16 h-16 bg-ice-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-ice-500/30 transition-colors">
              <UserPlus className="w-8 h-8 text-ice-400" />
            </div>
            <h3 className="text-lg font-bold mb-1">Create Room</h3>
            <p className="text-sm text-dark-400">Battle a friend</p>
          </button>

          <button
            onClick={() => setShowJoinModal(true)}
            className="card-hover flex flex-col items-center justify-center py-8 group"
          >
            <div className="w-16 h-16 bg-gold-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-gold-500/30 transition-colors">
              <Hash className="w-8 h-8 text-gold-400" />
            </div>
            <h3 className="text-lg font-bold mb-1">Join Room</h3>
            <p className="text-sm text-dark-400">Enter room code</p>
          </button>

          <button
            onClick={() => router.push('/tournaments')}
            className="card-hover flex flex-col items-center justify-center py-8 group"
          >
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
              <Trophy className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold mb-1">Tournaments</h3>
            <p className="text-sm text-dark-400">Compete for glory</p>
          </button>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6"
        >
          <button
            onClick={() => router.push('/practice')}
            className="card py-4 flex flex-col items-center gap-2 hover:border-dark-600 transition-colors"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm font-medium">Practice</span>
          </button>

          <button
            onClick={() => router.push('/friends')}
            className="card py-4 flex flex-col items-center gap-2 hover:border-dark-600 transition-colors"
          >
            <div className="w-10 h-10 bg-ice-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-ice-400" />
            </div>
            <span className="text-sm font-medium">Friends</span>
          </button>

          <button
            onClick={() => router.push('/crews')}
            className="card py-4 flex flex-col items-center gap-2 hover:border-dark-600 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm font-medium">Crews</span>
          </button>

          <button
            onClick={() => router.push('/achievements')}
            className="card py-4 flex flex-col items-center gap-2 hover:border-dark-600 transition-colors"
          >
            <div className="w-10 h-10 bg-gold-500/20 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-gold-400" />
            </div>
            <span className="text-sm font-medium">Badges</span>
          </button>

          <button
            onClick={() => router.push('/stats')}
            className="card py-4 flex flex-col items-center gap-2 hover:border-dark-600 transition-colors"
          >
            <div className="w-10 h-10 bg-fire-500/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-fire-400" />
            </div>
            <span className="text-sm font-medium">Stats</span>
          </button>

          <button
            onClick={() => router.push(`/profile/${user.id}`)}
            className="card py-4 flex flex-col items-center gap-2 hover:border-dark-600 transition-colors"
          >
            <div className="w-10 h-10 bg-dark-600 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-dark-300" />
            </div>
            <span className="text-sm font-medium">Profile</span>
          </button>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold-500" />
                <h3 className="text-lg font-bold">Leaderboard</h3>
              </div>
              <button
                onClick={() => router.push('/leaderboard')}
                className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((player, index) => {
                const playerRank = getEloRank(player.elo_rating)
                const isCurrentUser = player.id === user.id
                return (
                  <div
                    key={player.id}
                    onClick={() => router.push(`/profile/${player.id}`)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                      isCurrentUser ? 'bg-fire-500/10 border border-fire-500/30' : 'bg-dark-700/50 hover:bg-dark-700'
                    }`}
                  >
                    <span className={`w-6 text-center font-bold ${
                      index === 0 ? 'text-gold-400' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-500' :
                      'text-dark-500'
                    }`}>
                      {index + 1}
                    </span>
                    <img
                      src={getAvatarUrl(player.username, player.avatar_url)}
                      alt={player.username}
                      className="w-10 h-10 rounded-full bg-dark-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {player.username}
                        {isCurrentUser && <span className="text-fire-400 text-xs ml-2">(You)</span>}
                      </p>
                      <p className="text-xs text-dark-400">
                        {player.wins}W - {player.losses}L
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${playerRank.color}`}>
                        {playerRank.icon} {formatElo(player.elo_rating)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Recent Battles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-ice-500" />
                <h3 className="text-lg font-bold">Recent Battles</h3>
              </div>
              <button
                onClick={() => router.push('/history')}
                className="text-sm text-ice-400 hover:text-ice-300 flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {recentBattles.length > 0 ? (
              <div className="space-y-2">
                {recentBattles.map((battle) => {
                  const isPlayer1 = battle.player1_id === user.id
                  const opponent = isPlayer1 ? battle.player2 : battle.player1
                  const won = battle.winner_id === user.id
                  const myScore = isPlayer1 ? battle.player1_total_score : battle.player2_total_score
                  const theirScore = isPlayer1 ? battle.player2_total_score : battle.player1_total_score

                  return (
                    <div
                      key={battle.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        won ? 'bg-green-500/10 border border-green-500/30' : 'bg-fire-500/10 border border-fire-500/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        won ? 'bg-green-500/20' : 'bg-fire-500/20'
                      }`}>
                        {won ? '🏆' : '💀'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          vs {opponent?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-dark-400">
                          {formatDate(battle.completed_at || battle.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${won ? 'text-green-400' : 'text-fire-400'}`}>
                          {won ? 'WIN' : 'LOSS'}
                        </span>
                        <p className="text-xs text-dark-400">
                          {myScore?.toFixed(1)} - {theirScore?.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-dark-400">
                <Swords className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No battles yet</p>
                <p className="text-sm">Start your first battle!</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card max-w-sm w-full"
          >
            <h3 className="text-xl font-bold mb-4">Join Battle Room</h3>
            <p className="text-dark-400 mb-4">Enter the 6-character room code</p>
            
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              className="input text-center text-2xl font-mono tracking-widest mb-4"
              placeholder="ABC123"
              maxLength={6}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="btn-dark flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={joinCode.length < 4}
                className="btn-fire flex-1 disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
