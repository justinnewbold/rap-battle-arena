'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Check, Users, ArrowLeft, Loader2, Settings, Vote, Eye, EyeOff, Music, Play, Pause, Share2 } from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { supabase, createBattle, Battle, CreateBattleOptions, getBeats, Beat, getUserBeats, UserBeat } from '@/lib/supabase'
import { getAvatarUrl, generateRoomCode, cn } from '@/lib/utils'
import { SAMPLE_BEATS, DEMO_LIBRARY_BEATS, DEMO_USER_BEATS } from '@/lib/constants'

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

  // Beat selection
  const [beats, setBeats] = useState<Beat[]>([])
  const [userBeats, setUserBeats] = useState<UserBeat[]>([])
  const [selectedBeat, setSelectedBeat] = useState<Beat | null>(null)
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [beatSection, setBeatSection] = useState<'all' | 'mine'>('all')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadBeats()
  }, [user, router])

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef) {
        audioRef.pause()
        audioRef.src = ''
      }
    }
  }, [audioRef])

  async function loadBeats() {
    const [loadedBeats, loadedUserBeats] = await Promise.all([
      getBeats(),
      user && !isDemo ? getUserBeats(user.id) : Promise.resolve([])
    ])

    setBeats(loadedBeats)
    setUserBeats(loadedUserBeats)

    // Demo beats if none loaded
    if (loadedBeats.length === 0) {
      setBeats([...DEMO_LIBRARY_BEATS])
    }

    // Demo user beats
    if (isDemo && loadedUserBeats.length === 0) {
      setUserBeats([...DEMO_USER_BEATS] as UserBeat[])
    }
  }

  function toggleBeatPlay(beat: Beat) {
    if (!beat.audio_url) return

    if (playingBeatId === beat.id) {
      // Stop playing
      if (audioRef) {
        audioRef.pause()
      }
      setPlayingBeatId(null)
    } else {
      // Play new beat
      if (audioRef) {
        audioRef.pause()
      }
      const audio = new Audio(beat.audio_url)
      audio.loop = true
      audio.play()
      setAudioRef(audio)
      setPlayingBeatId(beat.id)
    }
  }

  async function handleCreateBattle() {
    const code = searchParams.get('code') || generateRoomCode()
    setRoomCode(code)
    setStep('waiting')

    if (isDemo) {
      return
    }

    // Stop any playing audio
    if (audioRef) {
      audioRef.pause()
      setPlayingBeatId(null)
    }

    const options: CreateBattleOptions = {
      player1Id: user!.id,
      roomCode: code,
      totalRounds,
      votingStyle,
      showVotesDuringBattle: votingStyle === 'per_round' ? showVotesDuringBattle : false,
      beatId: selectedBeat?.id.startsWith('demo-') ? null : selectedBeat?.id
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

  async function handleCancel() {
    if (battle) {
      try {
        await supabase.from('battles').delete().eq('id', battle.id)
      } catch (err) {
        console.error('Error deleting battle:', err)
      }
    }
    router.push('/dashboard')
  }

  async function handleBack() {
    if (step === 'waiting') {
      if (battle) {
        try {
          await supabase.from('battles').delete().eq('id', battle.id)
        } catch (err) {
          console.error('Error deleting battle:', err)
        }
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

              {/* Beat Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <Music className="w-4 h-4 inline mr-2" />
                  Battle Beat (Optional)
                </label>

                {/* Beat Section Tabs */}
                {userBeats.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setBeatSection('all')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        beatSection === 'all'
                          ? 'bg-gold-500 text-black'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      )}
                    >
                      Library
                    </button>
                    <button
                      onClick={() => setBeatSection('mine')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        beatSection === 'mine'
                          ? 'bg-gold-500 text-black'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      )}
                    >
                      My Beats ({userBeats.length})
                    </button>
                  </div>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {/* No beat option */}
                  <button
                    onClick={() => setSelectedBeat(null)}
                    className={cn(
                      "w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left",
                      selectedBeat === null
                        ? 'bg-gold-500/20 border border-gold-500/30'
                        : 'bg-dark-700 hover:bg-dark-600'
                    )}
                  >
                    <div className="w-10 h-10 bg-dark-600 rounded-lg flex items-center justify-center">
                      <Music className="w-5 h-5 text-dark-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">No Beat</p>
                      <p className="text-xs text-dark-400">Freestyle without music</p>
                    </div>
                  </button>

                  {/* User's beats (when "mine" tab selected) */}
                  {beatSection === 'mine' && userBeats.map((beat) => (
                    <div
                      key={beat.id}
                      className={cn(
                        "w-full p-3 rounded-xl flex items-center gap-3 transition-all",
                        selectedBeat?.id === beat.id
                          ? 'bg-gold-500/20 border border-gold-500/30'
                          : 'bg-dark-700 hover:bg-dark-600'
                      )}
                    >
                      <button
                        onClick={() => toggleBeatPlay(beat)}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          playingBeatId === beat.id
                            ? 'bg-purple-500 text-white'
                            : 'bg-dark-600 hover:bg-dark-500'
                        )}
                      >
                        {playingBeatId === beat.id ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedBeat(beat)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{beat.name}</p>
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                            MY BEAT
                          </span>
                        </div>
                        <p className="text-xs text-dark-400">
                          {beat.artist} • {beat.bpm} BPM
                        </p>
                      </button>
                      {selectedBeat?.id === beat.id && (
                        <Check className="w-5 h-5 text-gold-400 shrink-0" />
                      )}
                    </div>
                  ))}

                  {/* Library beats */}
                  {beatSection === 'all' && beats.map((beat) => (
                    <div
                      key={beat.id}
                      className={cn(
                        "w-full p-3 rounded-xl flex items-center gap-3 transition-all",
                        selectedBeat?.id === beat.id
                          ? 'bg-gold-500/20 border border-gold-500/30'
                          : 'bg-dark-700 hover:bg-dark-600'
                      )}
                    >
                      {/* Play button */}
                      <button
                        onClick={() => toggleBeatPlay(beat)}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          playingBeatId === beat.id
                            ? 'bg-gold-500 text-black'
                            : 'bg-dark-600 hover:bg-dark-500'
                        )}
                      >
                        {playingBeatId === beat.id ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </button>

                      {/* Beat info - clickable to select */}
                      <button
                        onClick={() => setSelectedBeat(beat)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{beat.name}</p>
                          {beat.is_premium && (
                            <span className="text-xs bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-dark-400">
                          {beat.artist} • {beat.bpm} BPM
                        </p>
                      </button>

                      {/* Selected indicator */}
                      {selectedBeat?.id === beat.id && (
                        <Check className="w-5 h-5 text-gold-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

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

            {/* Share Link */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/battle/join?code=${roomCode}`
                  navigator.clipboard.writeText(shareUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={() => {
                    navigator.share({
                      title: 'Join my rap battle!',
                      text: `Join my rap battle with code: ${roomCode}`,
                      url: `${window.location.origin}/battle/join?code=${roomCode}`
                    })
                  }}
                  className="py-2 px-4 bg-fire-500 hover:bg-fire-400 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                >
                  Share
                </button>
              )}
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
              <div className="flex justify-between text-dark-400 mt-1">
                <span>Beat:</span>
                <span className="text-white">
                  {selectedBeat ? selectedBeat.name : 'No beat'}
                </span>
              </div>
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
