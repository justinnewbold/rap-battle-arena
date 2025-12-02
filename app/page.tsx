'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mic2, Trophy, Users, Zap, Play, LogIn, UserPlus, Gamepad2 } from 'lucide-react'
import { useUserStore, DEMO_USER } from '@/lib/store'
import { supabase, getLeaderboard, Profile } from '@/lib/supabase'
import { getAvatarUrl, formatElo, getEloRank } from '@/lib/utils'

export default function HomePage() {
  const router = useRouter()
  const { user, setUser, setDemo, isLoading, setLoading } = useUserStore()
  const [leaderboard, setLeaderboard] = useState<Profile[]>([])

  useEffect(() => {
    // Check for existing session
    checkUser()
    // Load leaderboard
    loadLeaderboard()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (profile) {
        setUser(profile)
      }
    }
    setLoading(false)
  }

  async function loadLeaderboard() {
    const data = await getLeaderboard(5)
    setLeaderboard(data)
  }

  function handleDemoMode() {
    setUser(DEMO_USER)
    setDemo(true)
    router.push('/dashboard')
  }

  function handleLogin() {
    router.push('/login')
  }

  function handleSignUp() {
    router.push('/signup')
  }

  // If logged in, redirect to dashboard
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-fire-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-fire-900/20 via-dark-950 to-ice-900/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-fire-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-ice-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-fire-500 to-fire-600 rounded-2xl flex items-center justify-center glow-fire">
                <Mic2 className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display tracking-wider mb-4">
              <span className="gradient-text-fire">RAP BATTLE</span>{' '}
              <span className="text-white">ARENA</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-dark-300 mb-8 max-w-2xl mx-auto">
              Battle rappers worldwide with <span className="text-fire-400">AI-powered judging</span>. 
              Record your verses, get scored on flow, rhymes, and punchlines.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDemoMode}
                className="btn-fire flex items-center justify-center gap-2 text-lg px-8 py-4"
              >
                <Play className="w-5 h-5" />
                Try Demo Mode
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignUp}
                className="btn-ice flex items-center justify-center gap-2 text-lg px-8 py-4"
              >
                <UserPlus className="w-5 h-5" />
                Sign Up Free
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogin}
                className="btn-dark flex items-center justify-center gap-2 text-lg px-8 py-4"
              >
                <LogIn className="w-5 h-5" />
                Login
              </motion.button>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 mb-16"
          >
            <div className="card text-center">
              <div className="w-14 h-14 bg-fire-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mic2 className="w-7 h-7 text-fire-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Live Battles</h3>
              <p className="text-dark-400">Record your verses in real-time against opponents worldwide</p>
            </div>
            
            <div className="card text-center">
              <div className="w-14 h-14 bg-ice-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-ice-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Judging</h3>
              <p className="text-dark-400">GPT-4 analyzes your bars for rhymes, flow, punchlines & more</p>
            </div>
            
            <div className="card text-center">
              <div className="w-14 h-14 bg-gold-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-7 h-7 text-gold-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Climb Rankings</h3>
              <p className="text-dark-400">Win battles to increase your ELO and become a legend</p>
            </div>
          </motion.div>

          {/* Leaderboard Preview */}
          {leaderboard.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="card max-w-md mx-auto"
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-gold-500" />
                <h3 className="text-lg font-bold">Top Battlers</h3>
              </div>
              
              <div className="space-y-3">
                {leaderboard.map((player, index) => {
                  const rank = getEloRank(player.elo_rating)
                  return (
                    <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-dark-700/50">
                      <span className="w-6 text-center font-bold text-dark-400">
                        {index + 1}
                      </span>
                      <img
                        src={getAvatarUrl(player.username, player.avatar_url)}
                        alt={player.username}
                        className="w-8 h-8 rounded-full bg-dark-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.username}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${rank.color}`}>
                          {rank.icon} {formatElo(player.elo_rating)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-dark-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-dark-500">
          <p>Built with 🔥 by Justin @ Patty Shack</p>
        </div>
      </footer>
    </div>
  )
}
