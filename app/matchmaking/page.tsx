'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mic2, X, Users, Zap } from 'lucide-react'
import { useUserStore, useBattleStore } from '@/lib/store'
import { supabase, createBattle, Profile } from '@/lib/supabase'
import { getAvatarUrl, generateRoomCode } from '@/lib/utils'

export default function MatchmakingPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const { setCurrentBattle, setMatchmaking, matchmakingTime, setMatchmakingTime } = useBattleStore()
  const [status, setStatus] = useState<'searching' | 'found' | 'connecting'>('searching')
  const [opponent, setOpponent] = useState<Profile | null>(null)
  const [dots, setDots] = useState('')
  const timerRef = useRef(matchmakingTime)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    setMatchmaking(true)

    // Animated dots
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    // Timer - use ref to avoid stale closure
    const timerInterval = setInterval(() => {
      timerRef.current += 1
      setMatchmakingTime(timerRef.current)
    }, 1000)

    // Demo mode: simulate finding an opponent after 3-5 seconds
    if (isDemo) {
      const randomTime = 3000 + Math.random() * 2000
      const matchTimeout = setTimeout(() => {
        handleDemoMatch()
      }, randomTime)

      return () => {
        clearInterval(dotsInterval)
        clearInterval(timerInterval)
        clearTimeout(matchTimeout)
      }
    }

    // Real matchmaking: join queue
    const initMatchmaking = async () => {
      await joinMatchmakingQueue()
    }
    initMatchmaking()

    return () => {
      clearInterval(dotsInterval)
      clearInterval(timerInterval)
      // Clean up Supabase channel subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      // Fire and forget cleanup - can't await in cleanup function
      leaveMatchmakingQueue()
    }
  }, [])

  async function joinMatchmakingQueue() {
    if (!user || isDemo) return

    // Add to matchmaking queue
    const { error } = await supabase
      .from('matchmaking_queue')
      .upsert({
        player_id: user.id,
        elo_rating: user.elo_rating,
        status: 'searching'
      })

    if (error) {
      console.error('Error joining queue:', error)
      return
    }

    // Subscribe to changes
    const channel = supabase
      .channel('matchmaking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `player_id=eq.${user.id}`
        },
        async (payload) => {
          if (payload.new.status === 'matched' && payload.new.battle_id) {
            // Found a match!
            setStatus('found')

            // Get opponent info
            if (payload.new.matched_with) {
              try {
                const { data: oppProfile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', payload.new.matched_with)
                  .single()

                if (oppProfile) {
                  setOpponent(oppProfile)
                }
              } catch (err) {
                console.error('Error fetching opponent profile:', err)
              }
            }

            // Wait a moment then go to battle
            setTimeout(() => {
              setStatus('connecting')
              setTimeout(() => {
                router.push(`/battle/${payload.new.battle_id}`)
              }, 1500)
            }, 2000)
          }
        }
      )
      .subscribe()

    // Store channel ref for cleanup
    channelRef.current = channel

    // Also check if we can match with someone
    await checkForMatch()
  }

  async function checkForMatch() {
    if (!user || isDemo) return

    // Find someone in queue with similar ELO (within 200 points)
    const { data: waitingPlayers } = await supabase
      .from('matchmaking_queue')
      .select('*, profile:profiles(*)')
      .eq('status', 'searching')
      .neq('player_id', user.id)
      .gte('elo_rating', user.elo_rating - 200)
      .lte('elo_rating', user.elo_rating + 200)
      .order('created_at', { ascending: true })
      .limit(1)

    if (waitingPlayers && waitingPlayers.length > 0) {
      const matched = waitingPlayers[0]
      
      // Create battle
      const roomCode = generateRoomCode()
      const battle = await createBattle({ player1Id: user.id, roomCode })
      
      if (battle) {
        // Update both players in queue
        await supabase
          .from('matchmaking_queue')
          .update({
            status: 'matched',
            matched_with: matched.player_id,
            battle_id: battle.id
          })
          .eq('player_id', user.id)

        await supabase
          .from('matchmaking_queue')
          .update({
            status: 'matched',
            matched_with: user.id,
            battle_id: battle.id
          })
          .eq('player_id', matched.player_id)

        // Update battle with player 2
        await supabase
          .from('battles')
          .update({
            player2_id: matched.player_id,
            status: 'ready'
          })
          .eq('id', battle.id)
      }
    }
  }

  async function leaveMatchmakingQueue() {
    if (!user || isDemo) return

    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('player_id', user.id)
    
    setMatchmaking(false)
  }

  function handleDemoMatch() {
    // Create fake opponent for demo
    const fakeOpponent: Profile = {
      id: 'demo-opponent-' + Date.now(),
      username: ['LyricLord', 'BeatBoxBandit', 'RhymeRuler', 'FlowMaster', 'BarsBaron'][Math.floor(Math.random() * 5)],
      avatar_url: null,
      elo_rating: 950 + Math.floor(Math.random() * 100),
      wins: Math.floor(Math.random() * 10),
      losses: Math.floor(Math.random() * 10),
      total_battles: Math.floor(Math.random() * 20),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setStatus('found')
    setOpponent(fakeOpponent)

    // Go to battle after animation
    setTimeout(() => {
      setStatus('connecting')
      setTimeout(() => {
        router.push(`/battle/demo-${Date.now()}`)
      }, 1500)
    }, 2000)
  }

  async function handleCancel() {
    // Clean up channel subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    await leaveMatchmakingQueue()
    router.push('/dashboard')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fire-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-md w-full">
        {status === 'searching' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Spinning rings */}
            <div className="relative w-48 h-48 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-fire-500/30 rounded-full spin-slow" />
              <div className="absolute inset-4 border-4 border-ice-500/30 rounded-full spin-reverse" />
              <div className="absolute inset-8 border-4 border-gold-500/30 rounded-full spin-slow" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-12 h-12 text-fire-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Finding Opponent{dots}</h2>
            <p className="text-dark-400 mb-4">Searching for rappers near your skill level</p>
            
            <div className="bg-dark-800 rounded-xl px-6 py-3 inline-block mb-6">
              <span className="text-dark-400 text-sm">Time: </span>
              <span className="font-mono text-xl">{formatTime(matchmakingTime)}</span>
            </div>

            <div>
              <button
                onClick={handleCancel}
                className="btn-dark inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {status === 'found' && opponent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-gold-400 text-lg font-bold mb-4">OPPONENT FOUND!</div>
            
            <div className="flex items-center justify-center gap-8 mb-6">
              {/* You */}
              <div className="text-center">
                <img
                  src={getAvatarUrl(user?.username || '', user?.avatar_url)}
                  alt="You"
                  className="w-20 h-20 rounded-full border-4 border-fire-500 mx-auto mb-2"
                />
                <p className="font-bold">{user?.username}</p>
                <p className="text-sm text-fire-400">{user?.elo_rating} ELO</p>
              </div>

              {/* VS */}
              <div className="text-4xl font-display text-gold-400 vs-text">VS</div>

              {/* Opponent */}
              <div className="text-center">
                <img
                  src={getAvatarUrl(opponent.username, opponent.avatar_url)}
                  alt={opponent.username}
                  className="w-20 h-20 rounded-full border-4 border-ice-500 mx-auto mb-2"
                />
                <p className="font-bold">{opponent.username}</p>
                <p className="text-sm text-ice-400">{opponent.elo_rating} ELO</p>
              </div>
            </div>

            <p className="text-dark-400">Get ready to battle!</p>
          </motion.div>
        )}

        {status === 'connecting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 border-4 border-fire-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold">Connecting to Battle Room...</h2>
          </motion.div>
        )}
      </div>
    </div>
  )
}
