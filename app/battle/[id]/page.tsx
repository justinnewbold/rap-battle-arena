'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic2, MicOff, Play, Pause, SkipForward, 
  Trophy, X, Volume2, VolumeX, ArrowLeft
} from 'lucide-react'
import { useUserStore, useBattleStore } from '@/lib/store'
import { supabase, getBattle, Battle, Profile } from '@/lib/supabase'
import { getAvatarUrl, formatElo, getEloRank, cn } from '@/lib/utils'

type BattlePhase = 'waiting' | 'countdown' | 'player1' | 'player2' | 'judging' | 'results'

interface RoundScore {
  rhyme: number
  flow: number
  punchlines: number
  delivery: number
  creativity: number
  rebuttal: number
  total: number
  feedback: string
}

const ROUND_DURATION = 60 // seconds
const COUNTDOWN_DURATION = 3

export default function BattlePage() {
  const router = useRouter()
  const params = useParams()
  const battleId = params.id as string
  
  const { user, isDemo } = useUserStore()
  const { resetBattle } = useBattleStore()

  // Battle state
  const [phase, setPhase] = useState<BattlePhase>('waiting')
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds] = useState(2)
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [timer, setTimer] = useState(ROUND_DURATION)
  const [isRecording, setIsRecording] = useState(false)

  // Players
  const [player1, setPlayer1] = useState<Profile | null>(null)
  const [player2, setPlayer2] = useState<Profile | null>(null)
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1)

  // Scores
  const [player1Scores, setPlayer1Scores] = useState<RoundScore[]>([])
  const [player2Scores, setPlayer2Scores] = useState<RoundScore[]>([])
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

  function setupDemoBattle() {
    setPlayer1(user)
    setPlayer2({
      id: 'demo-opponent',
      username: 'MC_Challenger',
      avatar_url: null,
      elo_rating: 980,
      wins: 5,
      losses: 3,
      total_battles: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Start countdown after a brief moment
    setTimeout(() => {
      setPhase('countdown')
    }, 1500)
  }

  async function loadBattle() {
    const battle = await getBattle(battleId)
    if (battle) {
      setPlayer1(battle.player1 || null)
      setPlayer2(battle.player2 || null)
      
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
            // Handle battle updates
            if (payload.new.status === 'ready') {
              setPhase('countdown')
            }
          }
        )
        .subscribe()

      if (battle.status === 'ready') {
        setPhase('countdown')
      }
    }
  }

  function startTurn() {
    setTimer(ROUND_DURATION)
    setPhase(currentTurn === 1 ? 'player1' : 'player2')
    
    // Auto-start recording for current player in demo mode
    if (isDemo && currentTurn === 1) {
      startRecording()
    }
  }

  async function startRecording() {
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
      // Continue without recording in demo
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

    // Generate demo scores
    const score = generateDemoScore()
    
    if (currentTurn === 1) {
      setPlayer1Scores(prev => [...prev, score])
    } else {
      setPlayer2Scores(prev => [...prev, score])
    }

    // Check if round is complete (both players went)
    if (currentTurn === 2) {
      // Check if battle is complete
      if (currentRound >= totalRounds) {
        setPhase('judging')
        setTimeout(() => calculateWinner(), 2000)
      } else {
        // Next round
        setCurrentRound(currentRound + 1)
        setCurrentTurn(1)
        setCountdown(COUNTDOWN_DURATION)
        setPhase('countdown')
      }
    } else {
      // Switch to player 2
      setCurrentTurn(2)
      setCountdown(COUNTDOWN_DURATION)
      setPhase('countdown')
      
      // In demo, simulate opponent's turn
      if (isDemo) {
        setTimeout(() => {
          // Auto-end opponent's turn after random time
          setTimeout(() => {
            endTurn()
          }, 5000 + Math.random() * 3000)
        }, COUNTDOWN_DURATION * 1000)
      }
    }
  }

  function generateDemoScore(): RoundScore {
    const randomScore = () => 5 + Math.random() * 5
    const scores = {
      rhyme: randomScore(),
      flow: randomScore(),
      punchlines: randomScore(),
      delivery: randomScore(),
      creativity: randomScore(),
      rebuttal: randomScore(),
      total: 0,
      feedback: ''
    }
    
    // Calculate weighted total
    scores.total = (
      scores.rhyme * 0.20 +
      scores.flow * 0.25 +
      scores.punchlines * 0.20 +
      scores.delivery * 0.15 +
      scores.creativity * 0.10 +
      scores.rebuttal * 0.10
    )
    
    scores.feedback = [
      "Solid bars with decent wordplay!",
      "Flow was tight, keep it up!",
      "Some fire punchlines in there!",
      "Good energy and delivery!",
      "Creative approach to the beat!"
    ][Math.floor(Math.random() * 5)]

    return scores
  }

  function calculateWinner() {
    const p1Total = player1Scores.reduce((sum, s) => sum + s.total, 0)
    const p2Total = player2Scores.reduce((sum, s) => sum + s.total, 0)
    
    setWinner(p1Total > p2Total ? 1 : 2)
    setPhase('results')
  }

  function handleSkip() {
    if (phase === 'player1' || phase === 'player2') {
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
            <div className="text-sm text-dark-400">Round {currentRound} of {totalRounds}</div>
            <div className="font-bold">
              {phase === 'waiting' && 'Waiting...'}
              {phase === 'countdown' && 'Get Ready!'}
              {phase === 'player1' && `${player1.username}'s Turn`}
              {phase === 'player2' && `${player2?.username}'s Turn`}
              {phase === 'judging' && 'AI Judging...'}
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
              "w-24 h-24 rounded-full border-4 overflow-hidden mx-auto mb-2",
              phase === 'player1' ? 'border-fire-500 glow-fire' : 'border-dark-600'
            )}>
              <img
                src={getAvatarUrl(player1.username, player1.avatar_url)}
                alt={player1.username}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-bold">{player1.username}</p>
            <p className="text-sm text-fire-400">
              {player1Scores.reduce((sum, s) => sum + s.total, 0).toFixed(1)} pts
            </p>
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
              "w-24 h-24 rounded-full border-4 overflow-hidden mx-auto mb-2",
              phase === 'player2' ? 'border-ice-500 glow-ice' : 'border-dark-600'
            )}>
              <img
                src={getAvatarUrl(player2?.username || 'Opponent', player2?.avatar_url)}
                alt={player2?.username || 'Opponent'}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-bold">{player2?.username || 'Opponent'}</p>
            <p className="text-sm text-ice-400">
              {player2Scores.reduce((sum, s) => sum + s.total, 0).toFixed(1)} pts
            </p>
          </motion.div>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-fire-500/20 border border-fire-500/30 rounded-full px-6 py-3 mb-6"
          >
            <div className="w-3 h-3 bg-fire-500 rounded-full recording-pulse" />
            <span className="text-fire-400 font-medium">Recording...</span>
          </motion.div>
        )}

        {/* Judging Phase */}
        {phase === 'judging' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">AI Judges Deliberating...</h2>
            <p className="text-dark-400">Analyzing rhymes, flow, and punchlines</p>
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
              {winner === 1 && user.id === player1.id ? '🏆' : winner === 2 && user.id === player2?.id ? '🏆' : '😔'}
            </div>
            
            <h2 className="text-3xl font-bold mb-2">
              {winner === 1 ? player1.username : player2?.username} Wins!
            </h2>
            
            <div className="card mt-6 text-left">
              <h3 className="font-bold mb-4">Final Scores</h3>
              
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-xl",
                  winner === 1 ? 'bg-fire-500/20 border border-fire-500/30' : 'bg-dark-700'
                )}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{player1.username}</span>
                    <span className="text-2xl font-bold">
                      {player1Scores.reduce((sum, s) => sum + s.total, 0).toFixed(1)}
                    </span>
                  </div>
                  {player1Scores.map((score, i) => (
                    <div key={i} className="text-sm text-dark-400">
                      Round {i + 1}: {score.total.toFixed(1)} - {score.feedback}
                    </div>
                  ))}
                </div>

                <div className={cn(
                  "p-4 rounded-xl",
                  winner === 2 ? 'bg-ice-500/20 border border-ice-500/30' : 'bg-dark-700'
                )}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{player2?.username}</span>
                    <span className="text-2xl font-bold">
                      {player2Scores.reduce((sum, s) => sum + s.total, 0).toFixed(1)}
                    </span>
                  </div>
                  {player2Scores.map((score, i) => (
                    <div key={i} className="text-sm text-dark-400">
                      Round {i + 1}: {score.total.toFixed(1)} - {score.feedback}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleExit} className="btn-fire w-full mt-6">
              Back to Dashboard
            </button>
          </motion.div>
        )}

        {/* Controls */}
        {(phase === 'player1' || phase === 'player2') && currentTurn === 1 && (
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
