'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Hash, ArrowLeft, Loader2, AlertCircle, Swords, Eye } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { findBattleByCode, joinBattle, joinAsSpectator, Battle } from '@/lib/supabase'
import { getAvatarUrl } from '@/lib/utils'

type JoinMode = 'contestant' | 'spectator'

function JoinBattleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isDemo } = useUserStore()

  const [roomCode, setRoomCode] = useState('')
  const [status, setStatus] = useState<'input' | 'searching' | 'found' | 'joining' | 'error'>('input')
  const [error, setError] = useState('')
  const [battle, setBattle] = useState<Battle | null>(null)
  const [joinMode, setJoinMode] = useState<JoinMode | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    const code = searchParams.get('code')
    if (code) {
      setRoomCode(code)
      handleSearch(code)
    }
  }, [user, router, searchParams])

  async function handleSearch(code?: string) {
    const searchCode = code || roomCode
    if (!searchCode || searchCode.length < 4) {
      setError('Please enter a valid room code')
      return
    }

    setStatus('searching')
    setError('')

    if (isDemo) {
      // Simulate finding a room in demo mode
      setTimeout(() => {
        setBattle({
          id: 'demo-battle',
          room_code: searchCode,
          status: 'waiting',
          player1_id: 'demo-host',
          player2_id: null,
          winner_id: null,
          current_round: 1,
          total_rounds: 2,
          beat_id: null,
          player1_total_score: null,
          player2_total_score: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          voting_style: 'overall',
          show_votes_during_battle: false,
          player1: {
            id: 'demo-host',
            username: 'MC_Host',
            avatar_url: null,
            elo_rating: 1050,
            wins: 10,
            losses: 5,
            total_battles: 15,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })
        setStatus('found')
      }, 1000)
      return
    }

    // Real room search
    const foundBattle = await findBattleByCode(searchCode.toUpperCase())

    if (!foundBattle) {
      setError('Room not found. Check the code and try again.')
      setStatus('error')
      return
    }

    setBattle(foundBattle)
    setStatus('found')
  }

  async function handleJoin(mode: JoinMode) {
    if (!battle || !user) return

    setJoinMode(mode)
    setStatus('joining')

    if (isDemo) {
      setTimeout(() => {
        router.push(`/battle/demo-${Date.now()}${mode === 'spectator' ? '?spectator=true' : ''}`)
      }, 1000)
      return
    }

    if (mode === 'contestant') {
      // Check if battle already has opponent
      if (battle.player2_id) {
        setError('This battle already has two contestants.')
        setStatus('error')
        return
      }

      // Check if it's your own battle
      if (battle.player1_id === user.id) {
        setError("You can't join your own battle as a contestant!")
        setStatus('error')
        return
      }

      // Check battle status
      if (battle.status !== 'waiting') {
        setError('This battle has already started. You can join as a spectator instead.')
        setStatus('error')
        return
      }

      const updatedBattle = await joinBattle(battle.id, user.id)
      if (updatedBattle) {
        setTimeout(() => {
          router.push(`/battle/${battle.id}`)
        }, 1000)
      } else {
        setError('Failed to join battle. Please try again.')
        setStatus('error')
      }
    } else {
      // Join as spectator
      const spectator = await joinAsSpectator(battle.id, user.id)
      if (spectator) {
        setTimeout(() => {
          router.push(`/battle/${battle.id}?spectator=true`)
        }, 1000)
      } else {
        setError('Failed to join as spectator. Please try again.')
        setStatus('error')
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleSearch()
  }

  const canJoinAsContestant = battle &&
    battle.status === 'waiting' &&
    !battle.player2_id &&
    battle.player1_id !== user?.id

  const battleInProgress = battle && (battle.status === 'battling' || battle.status === 'ready')

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-900/10 via-dark-950 to-fire-900/10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-md w-full"
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="card">
          <div className="w-16 h-16 bg-gold-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-gold-400" />
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">Join Battle</h2>
          <p className="text-dark-400 text-center mb-6">Enter the room code to join</p>

          {status === 'input' && (
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="input text-center text-3xl font-mono tracking-widest mb-4"
                placeholder="ABC123"
                maxLength={6}
                autoFocus
              />

              {error && (
                <div className="flex items-center gap-2 text-fire-400 text-sm mb-4">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={roomCode.length < 4}
                className="btn-gold w-full disabled:opacity-50"
              >
                Find Room
              </button>
            </form>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="text-fire-400 mb-4">
                <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                {error}
              </div>
              <button
                onClick={() => {
                  setStatus('input')
                  setError('')
                  setBattle(null)
                  setJoinMode(null)
                }}
                className="btn-dark"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'searching' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-gold-400" />
              <p className="text-dark-400">Searching for room...</p>
            </div>
          )}

          {status === 'found' && battle && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-green-400 font-bold mb-4">Room Found!</div>

                {/* Host info */}
                <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatarUrl(battle.player1?.username || 'Host', battle.player1?.avatar_url)}
                      alt={battle.player1?.username || 'Host'}
                      className="w-12 h-12 rounded-full border-2 border-fire-500"
                    />
                    <div className="text-left">
                      <p className="font-bold">{battle.player1?.username || 'Host'}</p>
                      <p className="text-sm text-dark-400">
                        {battleInProgress ? 'Battle in progress' : 'Waiting for opponent'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Battle settings */}
                <div className="bg-dark-800/30 rounded-xl p-3 mb-4 text-sm">
                  <div className="flex justify-between text-dark-400">
                    <span>Rounds:</span>
                    <span className="text-white">{battle.total_rounds}</span>
                  </div>
                  <div className="flex justify-between text-dark-400 mt-1">
                    <span>Voting:</span>
                    <span className="text-white">
                      {battle.voting_style === 'per_round' ? 'Each Round' : 'At End'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Join options */}
              <div className="space-y-3">
                {canJoinAsContestant && (
                  <button
                    onClick={() => handleJoin('contestant')}
                    className="w-full py-4 bg-gradient-to-r from-fire-500 to-fire-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-fire-400 hover:to-fire-500 transition-all"
                  >
                    <Swords className="w-5 h-5" />
                    Join as Contestant
                  </button>
                )}

                <button
                  onClick={() => handleJoin('spectator')}
                  className="w-full py-4 bg-dark-700 hover:bg-dark-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Eye className="w-5 h-5" />
                  Watch as Spectator
                </button>

                {!canJoinAsContestant && battle.status === 'waiting' && battle.player1_id === user?.id && (
                  <p className="text-sm text-dark-400 text-center">
                    This is your battle room
                  </p>
                )}

                {battle.player2_id && battle.status === 'waiting' && (
                  <p className="text-sm text-dark-400 text-center">
                    Battle already has two contestants
                  </p>
                )}
              </div>
            </div>
          )}

          {status === 'joining' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-fire-400" />
              <p className="text-dark-400">
                {joinMode === 'spectator' ? 'Joining as spectator...' : 'Joining battle...'}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function JoinBattlePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JoinBattleContent />
    </Suspense>
  )
}
