'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Search } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { supabase, findBattleByCode, joinBattle } from '@/lib/supabase'
import { getAvatarUrl } from '@/lib/utils'

function JoinBattleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isDemo } = useUserStore()
  
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [status, setStatus] = useState<'input' | 'searching' | 'found' | 'joining' | 'error'>('input')
  const [error, setError] = useState('')
  const [opponent, setOpponent] = useState<any>(null)

  async function handleJoin() {
    if (code.length < 4) {
      setError('Please enter a valid room code')
      return
    }
    setStatus('searching')
    setError('')

    if (isDemo) {
      setTimeout(() => {
        setOpponent({ username: 'MC_Destroyer', avatar_url: null })
        setStatus('found')
        setTimeout(() => {
          setStatus('joining')
          setTimeout(() => { router.push(`/battle/demo-${Date.now()}`) }, 1000)
        }, 1500)
      }, 1000)
      return
    }

    const battle = await findBattleByCode(code.toUpperCase())
    if (!battle) {
      setStatus('error')
      setError('Room not found. Check the code and try again.')
      return
    }
    if (battle.status !== 'waiting') {
      setStatus('error')
      setError('This battle has already started or ended.')
      return
    }
    if (battle.player1_id === user?.id) {
      setStatus('error')
      setError("You can't join your own battle!")
      return
    }

    const { data: opponentData } = await supabase.from('users').select('*').eq('id', battle.player1_id).single()
    setOpponent(opponentData)
    setStatus('found')

    setTimeout(async () => {
      setStatus('joining')
      const success = await joinBattle(battle.id, user!.id)
      if (success) {
        setTimeout(() => { router.push(`/battle/${battle.id}`) }, 1000)
      } else {
        setStatus('error')
        setError('Failed to join battle. Please try again.')
      }
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-fire-900/10 via-dark-950 to-ice-900/10" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-md w-full">
        <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="card text-center">
          <div className="w-16 h-16 bg-fire-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-fire-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Join Battle</h2>
          <p className="text-dark-400 mb-6">Enter the room code to join</p>

          {status === 'input' && (
            <>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ENTER CODE"
                className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-fire-500 mb-4"
                maxLength={6}
              />
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button onClick={handleJoin} disabled={code.length < 4} className="btn-fire w-full disabled:opacity-50">
                Join Room
              </button>
            </>
          )}

          {status === 'searching' && (
            <div className="py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold-400" />
              <p className="text-dark-400 mt-4">Searching for room...</p>
            </div>
          )}

          {(status === 'found' || status === 'joining') && opponent && (
            <div className="py-8">
              <div className="text-green-400 font-bold mb-4">Room Found!</div>
              <div className="flex items-center justify-center gap-4">
                <img src={getAvatarUrl(user?.username || '', user?.avatar_url)} alt="You" className="w-16 h-16 rounded-full border-2 border-ice-500" />
                <span className="text-2xl font-bold text-gold-400">VS</span>
                <img src={getAvatarUrl(opponent.username, opponent.avatar_url)} alt="Opponent" className="w-16 h-16 rounded-full border-2 border-fire-500" />
              </div>
              {status === 'joining' && (
                <><Loader2 className="w-6 h-6 animate-spin mx-auto mt-4" /><p className="text-dark-400 mt-2">Joining battle...</p></>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={() => { setStatus('input'); setError('') }} className="btn-secondary">Try Again</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function LoadingFallback() {
  return (<div className="min-h-screen bg-dark-950 flex items-center justify-center"><div className="w-16 h-16 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" /></div>)
}

export default function JoinBattlePage() {
  return (<Suspense fallback={<LoadingFallback />}><JoinBattleContent /></Suspense>)
}
