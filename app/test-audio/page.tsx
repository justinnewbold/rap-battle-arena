'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX,
  Check, X, AlertCircle, Loader2, Music, Mic
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBeatGenerator, BEAT_PATTERNS, BeatPattern } from '@/lib/beat-generator'

type AudioStatus = 'idle' | 'playing' | 'paused'

export default function TestAudioPage() {
  const router = useRouter()
  const [currentBeat, setCurrentBeat] = useState<BeatPattern | null>(null)
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle')
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [audioWorking, setAudioWorking] = useState<boolean | null>(null)

  // Microphone test state
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle')
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    return () => {
      getBeatGenerator().stop()
      stopMicTest()
    }
  }, [])

  useEffect(() => {
    getBeatGenerator().setVolume(isMuted ? 0 : volume)
  }, [volume, isMuted])

  function playBeat(beat: BeatPattern) {
    const generator = getBeatGenerator()

    if (currentBeat?.name === beat.name && audioStatus === 'playing') {
      // Pause current beat
      generator.stop()
      setAudioStatus('paused')
      return
    }

    // Stop any current playback
    generator.stop()

    // Start new beat
    setCurrentBeat(beat)
    generator.start(beat)
    generator.setVolume(isMuted ? 0 : volume)
    setAudioStatus('playing')
    setAudioWorking(true)
  }

  function stopBeat() {
    getBeatGenerator().stop()
    setAudioStatus('idle')
    setCurrentBeat(null)
  }

  function togglePlayPause() {
    if (!currentBeat) return
    const generator = getBeatGenerator()

    if (audioStatus === 'playing') {
      generator.stop()
      setAudioStatus('paused')
    } else {
      generator.start(currentBeat)
      generator.setVolume(isMuted ? 0 : volume)
      setAudioStatus('playing')
    }
  }

  async function startMicTest() {
    setMicStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicStream(stream)
      setMicStatus('active')

      // Set up audio analysis
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256
      analyserRef.current = analyser

      // Start level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          setMicLevel(average / 255)
          animationRef.current = requestAnimationFrame(updateLevel)
        }
      }
      updateLevel()
    } catch (err) {
      console.error('Microphone error:', err)
      setMicStatus('error')
    }
  }

  function stopMicTest() {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop())
      setMicStream(null)
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    // Close the AudioContext to free resources
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setMicStatus('idle')
    setMicLevel(0)
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-dark-950 to-ice-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => {
              getBeatGenerator().stop()
              router.push('/dashboard')
            }}
            className="text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Volume2 className="w-8 h-8 text-purple-400" />
              Audio Test
            </h1>
            <p className="text-dark-400 mt-1">Test your audio playback and microphone</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Audio Playback Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-400" />
              Beat Playback Test
            </h2>

            <p className="text-dark-400 mb-4">
              Click on any beat to test your audio output. These beats use the Web Audio API
              and will play during your rap battles.
            </p>

            {/* Beat List */}
            <div className="space-y-2 mb-6">
              {BEAT_PATTERNS.map((beat) => (
                <div
                  key={beat.name}
                  onClick={() => playBeat(beat)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                    currentBeat?.name === beat.name
                      ? 'bg-purple-500/20 border border-purple-500/30'
                      : 'bg-dark-800 hover:bg-dark-700'
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                    currentBeat?.name === beat.name && audioStatus === 'playing'
                      ? 'bg-purple-500'
                      : 'bg-dark-700'
                  )}>
                    {currentBeat?.name === beat.name && audioStatus === 'playing' ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{beat.name}</p>
                    <p className="text-sm text-dark-400">
                      {beat.bpm} BPM • {beat.style.charAt(0).toUpperCase() + beat.style.slice(1)}
                    </p>
                  </div>

                  {currentBeat?.name === beat.name && audioStatus === 'playing' && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-purple-400 rounded-full"
                          animate={{
                            height: [8, 16, 8],
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Volume Control */}
            <div className="bg-dark-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1 h-2 bg-dark-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
                />
                <span className="text-sm text-dark-400 w-12 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            {/* Audio Test Result */}
            {audioWorking !== null && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-xl mb-4",
                audioWorking
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              )}>
                {audioWorking ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                <p className="text-sm">
                  {audioWorking
                    ? 'Audio is working! You should hear the beat playing.'
                    : 'Audio test failed. Check your device volume and speakers.'}
                </p>
              </div>
            )}

            {/* Stop Button */}
            {audioStatus === 'playing' && (
              <button
                onClick={stopBeat}
                className="btn-secondary w-full"
              >
                Stop Beat
              </button>
            )}
          </motion.div>

          {/* Microphone Test Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-fire-400" />
              Microphone Test
            </h2>

            <p className="text-dark-400 mb-4">
              Test your microphone to make sure it's working for rap battles.
              You'll want to use headphones so the beat doesn't get picked up by the mic.
            </p>

            {micStatus === 'idle' && (
              <button
                onClick={startMicTest}
                className="btn-ice w-full flex items-center justify-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Start Microphone Test
              </button>
            )}

            {micStatus === 'requesting' && (
              <div className="flex items-center justify-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Requesting microphone access...
              </div>
            )}

            {micStatus === 'active' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400">
                  <Check className="w-5 h-5" />
                  Microphone is working! Speak to see the level meter.
                </div>

                {/* Level Meter */}
                <div className="bg-dark-800 rounded-xl p-4">
                  <p className="text-sm text-dark-400 mb-2">Input Level</p>
                  <div className="h-8 bg-dark-700 rounded-lg overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-lg transition-colors",
                        micLevel > 0.7 ? 'bg-red-500' :
                        micLevel > 0.4 ? 'bg-yellow-500' :
                        'bg-green-500'
                      )}
                      animate={{ width: `${micLevel * 100}%` }}
                      transition={{ duration: 0.05 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-dark-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                <button
                  onClick={stopMicTest}
                  className="btn-secondary w-full"
                >
                  Stop Test
                </button>
              </div>
            )}

            {micStatus === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                  <X className="w-5 h-5" />
                  Could not access microphone. Please check your browser permissions.
                </div>
                <button
                  onClick={startMicTest}
                  className="btn-ice w-full flex items-center justify-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Try Again
                </button>
              </div>
            )}
          </motion.div>

          {/* Tips Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-gold-400" />
              Tips for Best Performance
            </h2>

            <ul className="space-y-3 text-dark-300">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <span><strong>Use headphones</strong> - This prevents the beat from being picked up by your microphone</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <span><strong>Find a quiet space</strong> - Background noise can interfere with your recording</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <span><strong>Position your mic correctly</strong> - Keep it 4-6 inches from your mouth</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <span><strong>Test before your battle</strong> - Make sure everything is working before you start</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
