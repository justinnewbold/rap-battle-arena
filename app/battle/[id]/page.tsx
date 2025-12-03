'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, MicOff, SkipForward, Trophy, Volume2, VolumeX, ArrowLeft,
  Users, Vote, Eye, ThumbsUp
} from 'lucide-react'
import { useUserStore, useBattleStore } from '@/lib/store'
import {
  supabase, getBattle, Battle, Profile,
  castVote, getVoteCounts, VoteCounts, getSpectatorCount, isUserSpectator
} from '@/lib/supabase'
import { getAvatarUrl, cn } from '@/lib/utils'

type BattlePhase = 'waiting' | 'countdown' | 'player1' | 'player2' | 'voting' | 'results'

const ROUND_DURATION = 60 // seconds
const COUNTDOWN_DURATION = 3

function BattleContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const battleId = params.id as string
  const isSpectatorParam = searchParams.get('spectator') === 'true'

  const { user, isDemo } = useUserStore()
  const { resetBattle } = useBattleStore()

  // Battle data
  const [battle, setBattle] = useState<Battle | null>(null)
  const [isSpectator, setIsSpectator] = useState(isSpectatorParam)

  // Battle state
  const [phase, setPhase] = useState<BattlePhase>('waiting')
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(2)
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [timer, setTimer] = useState(ROUND_DURATION)
  const [isRecording, setIsRecording] = useState(false)

  // Players
  const [player1, setPlayer1] = useState<Profile | null>(null)
  const [player2, setPlayer2] = useState<Profile | null>(null)
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1)

  // Voting
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({ player1Votes: 0, player2Votes: 0, totalVotes: 0 })
  const [hasVoted, setHasVoted] = useState(false)
  const [votedFor, setVotedFor] = useState<string | null>(null)
  const [spectatorCount, setSpectatorCount] = useState(0)

  // Winner
  const [winner, setWinner] = useState<1 | 2 | null>(null)

  // Audio
  const [isMuted, setIsMuted] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    if (isDemo || battleId.startsWith('demo-')) {
      setupDemoBattle()
    } else {
      loadBattle()
    }

    return () => {
      resetBattle()
    }
  }, [battleId])

  // Check if user is spectator
  useEffect(() => {
    async function checkSpectatorStatus() {
      if (!user || !battleId || battleId.startsWith('demo-')) return

      const spectator = await isUserSpectator(battleId, user.id)
      if (spectator) {
        setIsSpectator(true)
      }
    }
    checkSpectatorStatus()
  }, [battleId, user])

  // Countdown timer
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (phase === 'countdown' && countdown === 0) {
      startTurn()
    }
  }, [phase, countdown])

  // Round timer
  useEffect(() => {
    if ((phase === 'player1' || phase === 'player2') && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000)
      return () => clearInterval(interval)
    } else if ((phase === 'player1' || phase === 'player2') && timer === 0) {
      endTurn()
    }
  }, [phase, timer])

  // Poll spectator count
  useEffect(() => {
    if (battleId.startsWith('demo-')) return

    const interval = setInterval(async () => {
      const count = await getSpectatorCount(battleId)
      setSpectatorCount(count)
    }, 5000)

    return () => clearInterval(interval)
  }, [battleId])

  function setupDemoBattle() {
    const demoPlayer1 = isSpectator ? {
      id: 'demo-player1',
      username: 'MC_Fire',
      avatar_url: null,
      elo_rating: 1100,
      wins: 12,
      losses: 4,
      total_battles: 16,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } : user

    setPlayer1(demoPlayer1)
    setPlayer2({
      id: 'demo-opponent',
      username: 'MC_Ice',
      avatar_url: null,
      elo_rating: 980,
      wins: 5,
      losses: 3,
      total_battles: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    setBattle({
      id: battleId,
      room_code: 'DEMO',
      status: 'ready',
      player1_id: demoPlayer1?.id || '',
      player2_id: 'demo-opponent',
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
    })

    setTotalRounds(2)
    setSpectatorCount(isSpectator ? 1 : 0)

    // Start countdown after a brief moment
    setTimeout(() => {
      setPhase('countdown')
    }, 1500)
  }

  async function loadBattle() {
    const loadedBattle = await getBattle(battleId)
    if (loadedBattle) {
      setBattle(loadedBattle)
      setPlayer1(loadedBattle.player1 || null)
      setPlayer2(loadedBattle.player2 || null)
      setTotalRounds(loadedBattle.total_rounds)

      // Check if user is a contestant
      const isContestant = user?.id === loadedBattle.player1_id || user?.id === loadedBattle.player2_id
      if (!isContestant) {
        setIsSpectator(true)
      }

      // Get initial spectator count
      const count = await getSpectatorCount(battleId)
      setSpectatorCount(count)

      // Subscribe to battle updates
      const channel = supabase
        .channel(`battle-${battleId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'battles',
            filter: `id=eq.${battleId}`
          },
          (payload) => {
            if (payload.new.status === 'ready') {
              setPhase('countdown')
            }
          }
        )
        .subscribe()

      if (loadedBattle.status === 'ready') {
        setPhase('countdown')
      }
    }
  }

  function startTurn() {
    setTimer(ROUND_DURATION)
    setPhase(currentTurn === 1 ? 'player1' : 'player2')

    // Auto-start recording for current player (non-spectators)
    if (!isSpectator && isDemo && currentTurn === 1) {
      startRecording()
    }
  }

  async function startRecording() {
    if (isSpectator) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  function endTurn() {
    stopRecording()

    // Check if round is complete (both players went)
    if (currentTurn === 2) {
      // Check if battle is complete
      if (currentRound >= totalRounds) {
        // Go to voting phase
        setPhase('voting')
        setHasVoted(false)
        setVotedFor(null)

        // In demo mode, simulate voting results after delay
        if (isDemo) {
          setTimeout(() => {
            const p1Votes = Math.floor(Math.random() * 10) + 5
            const p2Votes = Math.floor(Math.random() * 10) + 5
            setVoteCounts({
              player1Votes: p1Votes,
              player2Votes: p2Votes,
              totalVotes: p1Votes + p2Votes
            })
          }, 2000)
        }
      } else {
        // Per-round voting if enabled
        if (battle?.voting_style === 'per_round') {
          setPhase('voting')
          setHasVoted(false)
          setVotedFor(null)
        } else {
          // Next round
          setCurrentRound(currentRound + 1)
          setCurrentTurn(1)
          setCountdown(COUNTDOWN_DURATION)
          setPhase('countdown')
        }
      }
    } else {
      // Switch to player 2
      setCurrentTurn(2)
      setCountdown(COUNTDOWN_DURATION)
      setPhase('countdown')

      // In demo, simulate opponent's turn
      if (isDemo) {
        setTimeout(() => {
          setTimeout(() => {
            endTurn()
          }, 3000 + Math.random() * 2000)
        }, COUNTDOWN_DURATION * 1000)
      }
    }
  }

  async function handleVote(playerId: string) {
    if (!isSpectator || hasVoted || !user || !battle) return

    setVotedFor(playerId)
    setHasVoted(true)

    if (!isDemo) {
      const roundNum = battle.voting_style === 'per_round' ? currentRound : null
      await castVote(battleId, user.id, playerId, roundNum)

      // Refresh vote counts
      if (player1 && player2) {
        const counts = await getVoteCounts(battleId, player1.id, player2.id, roundNum)
        setVoteCounts(counts)
      }
    } else {
      // Demo: increment vote count
      setVoteCounts(prev => ({
        player1Votes: prev.player1Votes + (playerId === player1?.id ? 1 : 0),
        player2Votes: prev.player2Votes + (playerId === player2?.id ? 1 : 0),
        totalVotes: prev.totalVotes + 1
      }))
    }
  }

  function proceedFromVoting() {
    if (currentRound >= totalRounds) {
      // Battle complete - determine winner
      calculateWinner()
    } else {
      // Next round
      setCurrentRound(currentRound + 1)
      setCurrentTurn(1)
      setCountdown(COUNTDOWN_DURATION)
      setPhase('countdown')
    }
  }

  function calculateWinner() {
    // Winner is determined by votes
    if (voteCounts.player1Votes > voteCounts.player2Votes) {
      setWinner(1)
    } else if (voteCounts.player2Votes > voteCounts.player1Votes) {
      setWinner(2)
    } else {
      // Tie - could implement tiebreaker logic
      setWinner(Math.random() > 0.5 ? 1 : 2)
    }
    setPhase('results')
  }

  function handleSkip() {
    if ((phase === 'player1' || phase === 'player2') && !isSpectator) {
      endTurn()
    }
  }

  function handleExit() {
    resetBattle()
    router.push('/dashboard')
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const canVote = isSpectator && !hasVoted && phase === 'voting'
  const showVotes = phase === 'voting' && (battle?.show_votes_during_battle || currentRound >= totalRounds)

  if (!user || !player1) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Header */}
      <header className="bg-dark-900/80 backdrop-blur-lg border-b border-dark-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={handleExit} className="text-dark-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-dark-400">
              <span>Round {currentRound} of {totalRounds}</span>
              {spectatorCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {spectatorCount}
                  </span>
                </>
              )}
            </div>
            <div className="font-bold flex items-center justify-center gap-2">
              {isSpectator && (
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                  SPECTATOR
                </span>
              )}
              {phase === 'waiting' && 'Waiting...'}
              {phase === 'countdown' && 'Get Ready!'}
              {phase === 'player1' && `${player1.username}'s Turn`}
              {phase === 'player2' && `${player2?.username}'s Turn`}
              {phase === 'voting' && 'Vote Now!'}
              {phase === 'results' && 'Battle Complete!'}
            </div>
          </div>

          <button onClick={() => setIsMuted(!isMuted)} className="text-dark-400 hover:text-white">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Main Battle Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* VS Display */}
        <div className="flex items-center justify-center gap-8 mb-8">
          {/* Player 1 */}
          <motion.div
            animate={{
              scale: phase === 'player1' ? 1.1 : 1,
              opacity: phase === 'player2' ? 0.5 : 1
            }}
            className="text-center"
          >
            <div className={cn(
              "w-24 h-24 rounded-full border-4 overflow-hidden mx-auto mb-2 relative",
              phase === 'player1' ? 'border-fire-500 glow-fire' : 'border-dark-600',
              canVote && 'cursor-pointer hover:border-fire-400'
            )}
              onClick={() => canVote && handleVote(player1.id)}
            >
              <img
                src={getAvatarUrl(player1.username, player1.avatar_url)}
                alt={player1.username}
                className="w-full h-full object-cover"
              />
              {votedFor === player1.id && (
                <div className="absolute inset-0 bg-fire-500/50 flex items-center justify-center">
                  <ThumbsUp className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <p className="font-bold">{player1.username}</p>
            {showVotes && (
              <p className="text-sm text-fire-400 font-bold">
                {voteCounts.player1Votes} votes
              </p>
            )}
          </motion.div>

          {/* VS / Timer */}
          <div className="text-center">
            {(phase === 'player1' || phase === 'player2') ? (
              <motion.div
                key={timer}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={cn(
                  "text-6xl font-display",
                  timer <= 10 ? 'text-fire-500' : 'text-white'
                )}
              >
                {formatTimer(timer)}
              </motion.div>
            ) : phase === 'countdown' ? (
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-display text-gold-400"
              >
                {countdown}
              </motion.div>
            ) : phase === 'voting' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-4xl"
              >
                <Vote className="w-16 h-16 text-gold-400 mx-auto" />
              </motion.div>
            ) : (
              <div className="text-4xl font-display text-gold-400 vs-text">VS</div>
            )}
          </div>

          {/* Player 2 */}
          <motion.div
            animate={{
              scale: phase === 'player2' ? 1.1 : 1,
              opacity: phase === 'player1' ? 0.5 : 1
            }}
            className="text-center"
          >
            <div className={cn(
              "w-24 h-24 rounded-full border-4 overflow-hidden mx-auto mb-2 relative",
              phase === 'player2' ? 'border-ice-500 glow-ice' : 'border-dark-600',
              canVote && 'cursor-pointer hover:border-ice-400'
            )}
              onClick={() => canVote && player2 && handleVote(player2.id)}
            >
              <img
                src={getAvatarUrl(player2?.username || 'Opponent', player2?.avatar_url)}
                alt={player2?.username || 'Opponent'}
                className="w-full h-full object-cover"
              />
              {votedFor === player2?.id && (
                <div className="absolute inset-0 bg-ice-500/50 flex items-center justify-center">
                  <ThumbsUp className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <p className="font-bold">{player2?.username || 'Opponent'}</p>
            {showVotes && (
              <p className="text-sm text-ice-400 font-bold">
                {voteCounts.player2Votes} votes
              </p>
            )}
          </motion.div>
        </div>

        {/* Recording Indicator (for contestants) */}
        {isRecording && !isSpectator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-fire-500/20 border border-fire-500/30 rounded-full px-6 py-3 mb-6"
          >
            <div className="w-3 h-3 bg-fire-500 rounded-full recording-pulse" />
            <span className="text-fire-400 font-medium">Recording...</span>
          </motion.div>
        )}

        {/* Spectator Watching Indicator */}
        {isSpectator && (phase === 'player1' || phase === 'player2') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-purple-500/20 border border-purple-500/30 rounded-full px-6 py-3 mb-6"
          >
            <Eye className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-medium">Watching live...</span>
          </motion.div>
        )}

        {/* Voting Phase */}
        {phase === 'voting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center max-w-md w-full"
          >
            {isSpectator ? (
              <>
                {!hasVoted ? (
                  <>
                    <h2 className="text-2xl font-bold mb-2">Cast Your Vote!</h2>
                    <p className="text-dark-400 mb-6">
                      Click on the rapper you think won {battle?.voting_style === 'per_round' ? 'this round' : 'the battle'}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <button
                        onClick={() => handleVote(player1.id)}
                        className="p-4 bg-fire-500/20 border border-fire-500/30 rounded-xl hover:bg-fire-500/30 transition-all"
                      >
                        <img
                          src={getAvatarUrl(player1.username, player1.avatar_url)}
                          alt={player1.username}
                          className="w-16 h-16 rounded-full mx-auto mb-2"
                        />
                        <p className="font-bold">{player1.username}</p>
                      </button>

                      <button
                        onClick={() => player2 && handleVote(player2.id)}
                        className="p-4 bg-ice-500/20 border border-ice-500/30 rounded-xl hover:bg-ice-500/30 transition-all"
                      >
                        <img
                          src={getAvatarUrl(player2?.username || 'Opponent', player2?.avatar_url)}
                          alt={player2?.username || 'Opponent'}
                          className="w-16 h-16 rounded-full mx-auto mb-2"
                        />
                        <p className="font-bold">{player2?.username}</p>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-green-400 text-xl font-bold mb-2">Vote Cast!</div>
                    <p className="text-dark-400 mb-4">
                      You voted for {votedFor === player1.id ? player1.username : player2?.username}
                    </p>
                    {showVotes && (
                      <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
                        <p className="text-sm text-dark-400 mb-2">Current Results</p>
                        <div className="flex justify-between">
                          <span className="text-fire-400">{player1.username}: {voteCounts.player1Votes}</span>
                          <span className="text-ice-400">{player2?.username}: {voteCounts.player2Votes}</span>
                        </div>
                      </div>
                    )}
                    <p className="text-dark-400 text-sm">Waiting for voting to end...</p>
                  </>
                )}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2">Spectators are Voting</h2>
                <p className="text-dark-400 mb-4">Wait for the audience to decide...</p>
                <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                {showVotes && (
                  <div className="bg-dark-800/50 rounded-xl p-4">
                    <p className="text-sm text-dark-400 mb-2">Current Votes</p>
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-fire-400">{player1.username}: {voteCounts.player1Votes}</span>
                      <span className="text-ice-400">{player2?.username}: {voteCounts.player2Votes}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Continue button (for demo or battle creator) */}
            {(isDemo || (!isSpectator && user?.id === battle?.player1_id)) && (
              <button
                onClick={proceedFromVoting}
                className="btn-fire w-full mt-6"
              >
                {currentRound >= totalRounds ? 'See Results' : 'Next Round'}
              </button>
            )}
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md w-full"
          >
            <div className="text-6xl mb-4">
              {winner === 1 && user?.id === player1.id ? '🏆' : winner === 2 && user?.id === player2?.id ? '🏆' : isSpectator ? '🎉' : '😔'}
            </div>

            <h2 className="text-3xl font-bold mb-2">
              {winner === 1 ? player1.username : player2?.username} Wins!
            </h2>

            <div className="card mt-6 text-left">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Final Vote Count
              </h3>

              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-xl",
                  winner === 1 ? 'bg-fire-500/20 border border-fire-500/30' : 'bg-dark-700'
                )}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img
                        src={getAvatarUrl(player1.username, player1.avatar_url)}
                        alt={player1.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <span className="font-medium">{player1.username}</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {voteCounts.player1Votes} votes
                    </span>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-xl",
                  winner === 2 ? 'bg-ice-500/20 border border-ice-500/30' : 'bg-dark-700'
                )}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img
                        src={getAvatarUrl(player2?.username || 'Opponent', player2?.avatar_url)}
                        alt={player2?.username || 'Opponent'}
                        className="w-10 h-10 rounded-full"
                      />
                      <span className="font-medium">{player2?.username}</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {voteCounts.player2Votes} votes
                    </span>
                  </div>
                </div>

                <div className="text-center text-dark-400 text-sm">
                  Total votes: {voteCounts.totalVotes}
                </div>
              </div>
            </div>

            <button onClick={handleExit} className="btn-fire w-full mt-6">
              Back to Dashboard
            </button>
          </motion.div>
        )}

        {/* Controls (for contestants only) */}
        {!isSpectator && (phase === 'player1' || phase === 'player2') && (
          <div className="flex gap-4 mt-8">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                isRecording
                  ? 'bg-fire-500 glow-fire'
                  : 'bg-dark-700 hover:bg-dark-600'
              )}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic2 className="w-6 h-6" />}
            </button>

            <button
              onClick={handleSkip}
              className="w-16 h-16 rounded-full bg-dark-700 hover:bg-dark-600 flex items-center justify-center"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
        )}
      </main>
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

export default function BattlePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BattleContent />
    </Suspense>
  )
}
