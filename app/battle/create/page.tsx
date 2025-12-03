'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Check, Users, ArrowLeft, Loader2, Settings, Vote, Eye, EyeOff } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { supabase, createBattle, Battle, CreateBattleOptions } from '@/lib/supabase'
import { getAvatarUrl, generateRoomCode } from '@/lib/utils'

type Step = 'settings' | 'waiting'

function CreateBattleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isDemo } = useUserStore()

  const [step, setStep] = useState<Step>('settings')
  const [roomCode, setRoomCode] = useState('')
  const [battle, setBattle] = useState<Battle | null>(null)
  const [copied, setCopied] = useState(false)
  const [waiting, setWaiting] = useState(true)

  // Battle settings
  const [totalRounds, setTotalRounds] = useState(2)
  const [votingStyle, setVotingStyle] = useState<'per_round' | 'overall'>('overall')
  const [showVotesDuringBattle, setShowVotesDuringBattle] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
  }, [user, router])

  async function handleCreateBattle() {
    const code = searchParams.get('code') || generateRoomCode()
    setRoomCode(code)
    setStep('waiting')

    if (isDemo) {
      return
    }

    const options: CreateBattleOptions = {
      player1Id: user!.id,
      roomCode: code,
      totalRounds,
      votingStyle,
      showVotesDuringBattle: votingStyle === 'per_round' ? showVotesDuringBattle : false
    }

    const newBattle = await createBattle(options)
    if (newBattle) {
      setBattle(newBattle)

      const channel = supabase
        .channel(`battle-${newBattle.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'battles',
            filter: `id=eq.${newBattle.id}`
          },
          (payload) => {
            if (payload.new.status === 'ready' && payload.new.player2_id) {
              setWaiting(false)
              setTimeout(() => {
                router.push(`/battle/${newBattle.id}`)
              }, 1500)
            }
          }
        )
        .subscribe()
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDemoStart() {
    router.push(`/battle/demo-${Date.now()}`)
  }

  function handleCancel() {
    if (battle) {
      supabase.from('battles').delete().eq('id', battle.id)
    }
    router.push('/dashboard')
  }

  function handleBack() {
    if (step === 'waiting') {
      if (battle) {
        supabase.from('battles').delete().eq('id', battle.id)
        setBattle(null)
      }
      setStep('settings')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-ice-900/10 via-dark-950 to-fire-900/10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-md w-full"
      >
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'waiting' ? 'Back to Settings' : 'Cancel'}
        </button>

        {step === 'settings' && (
          <div className="card">
            <div className="w-16 h-16 bg-fire-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-fire-400" />
            </div>

            <h2 className="text-2xl font-bold text-center mb-2">Battle Settings</h2>
            <p className="text-dark-400 text-center mb-6">Configure your battle rules</p>

            <div className="space-y-6">
              {/* Number of Rounds */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Number of Rounds
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setTotalRounds(num)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        totalRounds === num
                          ? 'bg-fire-500 text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voting Style */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <Vote className="w-4 h-4 inline mr-2" />
                  Spectator Voting
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVotingStyle('per_round')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all text-sm ${
                      votingStyle === 'per_round'
                        ? 'bg-ice-500 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    Vote Each Round
                  </button>
                  <button
                    onClick={() => setVotingStyle('overall')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all text-sm ${
                      votingStyle === 'overall'
                        ? 'bg-ice-500 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    Vote at End
                  </button>
                </div>
              </div>

              {/* Show Votes During Battle (only for per_round) */}
              {votingStyle === 'per_round' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Vote Visibility
                  </label>
                  <button
                    onClick={() => setShowVotesDuringBattle(!showVotesDuringBattle)}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      showVotesDuringBattle
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    {showVotesDuringBattle ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Show votes after each round
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide votes until battle ends
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* Info text */}
              <div className="bg-dark-800/50 rounded-xl p-4 text-sm text-dark-400">
                <p>
                  <strong className="text-dark-200">Spectators</strong> can watch the battle live and vote for their favorite rapper. Contestants cannot vote.
                </p>
              </div>

              <button
                onClick={handleCreateBattle}
                className="btn-fire w-full"
              >
                Create Battle Room
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="card text-center">
            <div className="w-16 h-16 bg-ice-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-ice-400" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Battle Room Created</h2>
            <p className="text-dark-400 mb-6">Share this code with your opponent</p>

            <div className="bg-dark-700 rounded-xl p-4 mb-4">
              <div className="text-4xl font-mono font-bold tracking-widest text-ice-400 mb-2">
                {roomCode}
              </div>
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Battle Settings Summary */}
            <div className="bg-dark-800/50 rounded-xl p-3 mb-4 text-sm text-left">
              <div className="flex justify-between text-dark-400">
                <span>Rounds:</span>
                <span className="text-white">{totalRounds}</span>
              </div>
              <div className="flex justify-between text-dark-400 mt-1">
                <span>Voting:</span>
                <span className="text-white">
                  {votingStyle === 'per_round' ? 'Each Round' : 'At End'}
                </span>
              </div>
              {votingStyle === 'per_round' && (
                <div className="flex justify-between text-dark-400 mt-1">
                  <span>Show Votes:</span>
                  <span className="text-white">
                    {showVotesDuringBattle ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
            </div>

            <div className="py-8">
              {waiting ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <img
                      src={getAvatarUrl(user?.username || '', user?.avatar_url)}
                      alt="You"
                      className="w-12 h-12 rounded-full border-2 border-fire-500"
                    />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-dark-600 flex items-center justify-center">
                      <span className="text-dark-500">?</span>
                    </div>
                  </div>
                  <p className="text-dark-400">Waiting for opponent to join...</p>
                </>
              ) : (
                <>
                  <div className="text-green-400 font-bold mb-2">Opponent Found!</div>
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  <p className="text-dark-400 mt-2">Starting battle...</p>
                </>
              )}
            </div>

            {isDemo && (
              <button onClick={handleDemoStart} className="btn-fire w-full">
                Start Demo Battle
              </button>
            )}
          </div>
        )}
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

export default function CreateBattlePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateBattleContent />
    </Suspense>
  )
}
