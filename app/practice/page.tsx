'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Mic2, MicOff, ArrowLeft, RotateCcw,
  Clock, Music, Award
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { getAvatarUrl, cn, formatTime } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'

const PRACTICE_DURATIONS = [30, 60, 90, 120]

const PRACTICE_BEATS = [
  { id: 'none', name: 'No Beat', bpm: 0 },
  { id: 'beat1', name: 'Classic Boom Bap', bpm: 90 },
  { id: 'beat2', name: 'Trap Fire', bpm: 140 },
  { id: 'beat3', name: 'Old School Flow', bpm: 85 },
  { id: 'beat4', name: 'Modern Vibes', bpm: 120 },
]

const WORD_PROMPTS = [
  ['fire', 'desire', 'higher', 'wire'],
  ['night', 'fight', 'light', 'right'],
  ['flow', 'show', 'know', 'go'],
  ['street', 'beat', 'heat', 'feat'],
  ['mic', 'like', 'strike', 'hype'],
  ['real', 'feel', 'deal', 'steel'],
  ['time', 'rhyme', 'climb', 'prime'],
  ['king', 'ring', 'thing', 'swing'],
]

export default function PracticePage() {
  const router = useRouter()
  const { user } = useUserStore()
  const sounds = useSounds()

  const [phase, setPhase] = useState<'setup' | 'countdown' | 'recording' | 'finished'>('setup')
  const [duration, setDuration] = useState(60)
  const [selectedBeat, setSelectedBeat] = useState(PRACTICE_BEATS[0])
  const [timer, setTimer] = useState(60)
  const [countdown, setCountdown] = useState(3)
  const [isRecording, setIsRecording] = useState(false)
  const [wordPrompt, setWordPrompt] = useState<string[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (!user) {
      router.push('/')
    }
  }, [user, router])

  // Countdown
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      sounds.play('countdown')
      const countdownTimeout = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(countdownTimeout)
    } else if (phase === 'countdown' && countdown === 0) {
      sounds.play('round_start')
      startRecording()
    }
  }, [phase, countdown])

  // Recording timer
  useEffect(() => {
    if (phase === 'recording' && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000)
      return () => clearInterval(interval)
    } else if (phase === 'recording' && timer === 0) {
      finishPractice()
    }
  }, [phase, timer])

  function startPractice() {
    // Pick random word prompt
    const randomPrompt = WORD_PROMPTS[Math.floor(Math.random() * WORD_PROMPTS.length)]
    setWordPrompt(randomPrompt)
    setTimer(duration)
    setCountdown(3)
    setPhase('countdown')
  }

  async function startRecording() {
    setPhase('recording')
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
      setPhase('setup')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  function finishPractice() {
    stopRecording()
    sounds.play('round_end')
    setPhase('finished')
  }

  function resetPractice() {
    setPhase('setup')
    setTimer(duration)
    setCountdown(3)
    setWordPrompt([])
    audioChunksRef.current = []
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 via-dark-950 to-purple-900/10" />

      {/* Header */}
      <header className="relative bg-dark-900/80 backdrop-blur-lg border-b border-dark-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="text-center">
            <h1 className="font-bold flex items-center justify-center gap-2">
              <Mic2 className="w-5 h-5 text-green-400" />
              Practice Mode
            </h1>
            <p className="text-xs text-dark-400">No ELO impact</p>
          </div>

          <div className="w-6" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-4">
        {phase === 'setup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="card mb-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mic2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-center mb-2">Practice Your Flow</h2>
              <p className="text-dark-400 text-center mb-6">
                Freestyle without affecting your ranking. Perfect for warming up or trying new styles.
              </p>

              {/* Duration Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRACTICE_DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDuration(d)
                        setTimer(d)
                      }}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all",
                        duration === d
                          ? 'bg-green-500 text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      )}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Beat Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  <Music className="w-4 h-4 inline mr-2" />
                  Beat
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {PRACTICE_BEATS.map((beat) => (
                    <button
                      key={beat.id}
                      onClick={() => setSelectedBeat(beat)}
                      className={cn(
                        "w-full p-3 rounded-xl flex items-center justify-between transition-all",
                        selectedBeat.id === beat.id
                          ? 'bg-green-500/20 border border-green-500/30'
                          : 'bg-dark-700 hover:bg-dark-600'
                      )}
                    >
                      <span>{beat.name}</span>
                      {beat.bpm > 0 && (
                        <span className="text-sm text-dark-400">{beat.bpm} BPM</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={startPractice} className="btn-fire w-full">
                Start Practice
              </button>
            </div>

            <div className="text-center text-dark-400 text-sm">
              <Award className="w-4 h-4 inline mr-1" />
              Practice sessions don't affect your stats or ranking
            </div>
          </motion.div>
        )}

        {phase === 'countdown' && (
          <motion.div
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="text-9xl font-display text-green-400 mb-4">
              {countdown}
            </div>
            <p className="text-dark-400">Get ready to flow!</p>
          </motion.div>
        )}

        {phase === 'recording' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md text-center"
          >
            {/* Timer */}
            <div className={cn(
              "text-8xl font-display mb-8",
              timer <= 10 ? 'text-fire-500' : 'text-green-400'
            )}>
              {formatTime(timer)}
            </div>

            {/* Recording indicator */}
            <div className="flex items-center justify-center gap-3 bg-green-500/20 border border-green-500/30 rounded-full px-6 py-3 mb-8 mx-auto w-fit">
              <div className="w-3 h-3 bg-green-500 rounded-full recording-pulse" />
              <span className="text-green-400 font-medium">Recording...</span>
            </div>

            {/* Word Prompts */}
            {wordPrompt.length > 0 && (
              <div className="card mb-8">
                <p className="text-sm text-dark-400 mb-2">Try to use these words:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {wordPrompt.map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Avatar */}
            <div className="mb-8">
              <img
                src={getAvatarUrl(user.username, user.avatar_url)}
                alt={user.username}
                className="w-24 h-24 rounded-full border-4 border-green-500 mx-auto glow-fire"
                style={{ boxShadow: '0 0 30px rgba(74, 222, 128, 0.5)' }}
              />
              <p className="font-bold mt-2">{user.username}</p>
            </div>

            {/* Stop button */}
            <button
              onClick={finishPractice}
              className="w-20 h-20 rounded-full bg-fire-500 hover:bg-fire-400 flex items-center justify-center mx-auto transition-colors"
            >
              <MicOff className="w-8 h-8" />
            </button>
            <p className="text-sm text-dark-400 mt-2">Tap to stop early</p>
          </motion.div>
        )}

        {phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center"
          >
            <div className="text-6xl mb-4">🎤</div>
            <h2 className="text-3xl font-bold mb-2">Nice Session!</h2>
            <p className="text-dark-400 mb-8">
              You practiced for {duration - timer} seconds. Keep grinding!
            </p>

            <div className="card mb-6 text-left">
              <h3 className="font-bold mb-3">Practice Tips</h3>
              <ul className="space-y-2 text-sm text-dark-400">
                <li>• Focus on breath control and delivery</li>
                <li>• Try different flows and cadences</li>
                <li>• Work on your punchlines</li>
                <li>• Practice freestyling about different topics</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetPractice}
                className="flex-1 btn-dark flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Practice Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 btn-fire"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
