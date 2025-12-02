'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Hash, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { supabase, findBattleByCode, joinBattle } from '@/lib/supabase'
import { getAvatarUrl } from '@/lib/utils'

export default function JoinBattlePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isDemo } = useUserStore()

  const [roomCode, setRoomCode] = useState('')
  const [status, setStatus] = useState<'input' | 'searching' | 'found' | 'joining' | 'error'>('input')
  const [error, setError] = useState('')
  const [opponent, setOpponent] = useState<any>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    const code = searchParams.get('code')
    if (code) {
      setRoomCode(code)
      handleJoin(code)
    }
  }, [])

  async function handleJoin(code?: string) {
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
        setOpponent({
          username: 'MC_Host',
          avatar_url: null,
          elo_rating: 1050
        })
        setStatus('found')
        
        setTimeout(() => {
          setStatus('joining')
          setTimeout(() => {
            router.push(`/battle/demo-${Date.now()}`)
          }, 1000)
        }, 1500)
      }, 1000)
      return
    }

    // Real room search
    const battle = await findBattleByCode(searchCode.toUpperCase())

    if (!battle) {
      setError('Room not found. Check the code and try again.')
      setStatus('error')
      return
    }

    if (battle.status !== 'waiting') {
      setError('This battle has already started or ended.')
      setStatus('error')
      return
    }

    if (battle.player1_id === user?.id) {
      setError("You can't join your own battle!")
      setStatus('error')
      return
    }

    // Found the battle
    setOpponent(battle.player1)
    setStatus('found')

    // Join the battle
    setTimeout(async () => {
      setStatus('joining')
      
      const updatedBattle = await joinBattle(battle.id, user!.id)
      if (updatedBattle) {
        setTimeout(() => {
          router.push(`/battle/${battle.id}`)
        }, 1000)
      } else {
        setError('Failed to join battle. Please try again.')
        setStatus('error')
      }
    }, 1500)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleJoin()
  }

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
                Join Room
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

          {status === 'found' && opponent && (
            <div className="text-center py-4">
              <div className="text-green-400 font-bold mb-4">Room Found!</div>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <img
                    src={getAvatarUrl(user?.username || '', user?.avatar_url)}
                    alt="You"
                    className="w-16 h-16 rounded-full border-2 border-ice-500 mx-auto mb-2"
                  />
                  <p className="text-sm font-medium">{user?.username}</p>
                </div>
                <div className="text-2xl font-display text-gold-400">VS</div>
                <div className="text-center">
                  <img
                    src={getAvatarUrl(opponent.username, opponent.avatar_url)}
                    alt={opponent.username}
                    className="w-16 h-16 rounded-full border-2 border-fire-500 mx-auto mb-2"
                  />
                  <p className="text-sm font-medium">{opponent.username}</p>
                </div>
              </div>
            </div>
          )}

          {status === 'joining' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-fire-400" />
              <p className="text-dark-400">Joining battle...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
