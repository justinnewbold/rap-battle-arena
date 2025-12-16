'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  Check, X, AlertCircle, Loader2, Music, Mic
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Sample audio tracks for testing
const TEST_TRACKS = [
  {
    id: 'test-1',
    name: 'Hip Hop Beat 1',
    artist: 'Mixkit',
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    category: 'Hip Hop'
  },
  {
    id: 'test-2',
    name: 'Hip Hop Beat 2',
    artist: 'Mixkit',
    url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-04-740.mp3',
    category: 'Hip Hop'
  },
  {
    id: 'test-3',
    name: 'Urban Fashion',
    artist: 'Mixkit',
    url: 'https://assets.mixkit.co/music/preview/mixkit-urban-fashion-hip-hop-654.mp3',
    category: 'Trap'
  },
  {
    id: 'test-4',
    name: 'Serene View',
    artist: 'Mixkit',
    url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
    category: 'Chill'
  },
  {
    id: 'test-5',
    name: 'Sleepy Cat',
    artist: 'Mixkit',
    url: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
    category: 'Lo-Fi'
  },
]

type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

interface TestResult {
  trackId: string
  status: 'success' | 'error'
  message: string
  loadTime?: number
}

export default function TestAudioPage() {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTrack, setCurrentTrack] = useState<typeof TEST_TRACKS[0] | null>(null)
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle')
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Microphone test state
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle')
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      stopMicTest()
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  function playTrack(track: typeof TEST_TRACKS[0]) {
    if (audioRef.current) {
      audioRef.current.pause()
    }

    setCurrentTrack(track)
    setAudioStatus('loading')
    setErrorMessage(null)
    setProgress(0)

    const audio = new Audio(track.url)
    audio.volume = isMuted ? 0 : volume

    audio.onloadedmetadata = () => {
      setDuration(audio.duration)
    }

    audio.oncanplaythrough = () => {
      setAudioStatus('playing')
      audio.play().catch(err => {
        console.error('Playback error:', err)
        setAudioStatus('error')
        setErrorMessage('Failed to play audio. Check browser autoplay settings.')
      })
    }

    audio.ontimeupdate = () => {
      setProgress(audio.currentTime)
    }

    audio.onended = () => {
      setAudioStatus('paused')
      setProgress(0)
    }

    audio.onerror = () => {
      setAudioStatus('error')
      setErrorMessage('Failed to load audio file. Check your network connection.')
    }

    audioRef.current = audio
    audio.load()
  }

  function togglePlayPause() {
    if (!audioRef.current || !currentTrack) return

    if (audioStatus === 'playing') {
      audioRef.current.pause()
      setAudioStatus('paused')
    } else if (audioStatus === 'paused') {
      audioRef.current.play().catch(err => {
        console.error('Playback error:', err)
        setErrorMessage('Failed to resume playback')
      })
      setAudioStatus('playing')
    }
  }

  function seekTo(time: number) {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setProgress(time)
    }
  }

  function skipTrack(direction: 'prev' | 'next') {
    if (!currentTrack) return
    const currentIndex = TEST_TRACKS.findIndex(t => t.id === currentTrack.id)
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (newIndex >= TEST_TRACKS.length) newIndex = 0
    if (newIndex < 0) newIndex = TEST_TRACKS.length - 1
    playTrack(TEST_TRACKS[newIndex])
  }

  async function runAllTests() {
    setIsRunningTests(true)
    setTestResults([])

    for (const track of TEST_TRACKS) {
      const startTime = Date.now()
      try {
        const result = await testTrack(track)
        const loadTime = Date.now() - startTime
        setTestResults(prev => [...prev, {
          trackId: track.id,
          status: result ? 'success' : 'error',
          message: result ? `Loaded successfully in ${loadTime}ms` : 'Failed to load',
          loadTime
        }])
      } catch (err) {
        setTestResults(prev => [...prev, {
          trackId: track.id,
          status: 'error',
          message: 'Error loading track'
        }])
      }
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunningTests(false)
  }

  function testTrack(track: typeof TEST_TRACKS[0]): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio()
      const timeout = setTimeout(() => {
        audio.src = ''
        resolve(false)
      }, 10000)

      audio.oncanplaythrough = () => {
        clearTimeout(timeout)
        audio.src = ''
        resolve(true)
      }

      audio.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }

      audio.src = track.url
      audio.load()
    })
  }

  async function startMicTest() {
    setMicStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicStream(stream)
      setMicStatus('active')

      // Set up audio analysis
      const audioContext = new AudioContext()
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
    }
    analyserRef.current = null
    setMicStatus('idle')
    setMicLevel(0)
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-dark-950 to-ice-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
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
              Audio Playback Test
            </h2>

            {/* Track List */}
            <div className="space-y-2 mb-6">
              {TEST_TRACKS.map((track) => {
                const result = testResults.find(r => r.trackId === track.id)
                return (
                  <div
                    key={track.id}
                    onClick={() => !isRunningTests && playTrack(track)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                      currentTrack?.id === track.id
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-dark-800 hover:bg-dark-700',
                      isRunningTests && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      currentTrack?.id === track.id ? 'bg-purple-500' : 'bg-dark-700'
                    )}>
                      {currentTrack?.id === track.id && audioStatus === 'loading' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : currentTrack?.id === track.id && audioStatus === 'playing' ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.name}</p>
                      <p className="text-sm text-dark-400">{track.artist} - {track.category}</p>
                    </div>

                    {result && (
                      <div className={cn(
                        "px-2 py-1 rounded text-xs flex items-center gap-1",
                        result.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>
                        {result.status === 'success' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {result.loadTime ? `${result.loadTime}ms` : 'Error'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Now Playing Controls */}
            {currentTrack && (
              <div className="bg-dark-800 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Music className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{currentTrack.name}</p>
                    <p className="text-sm text-dark-400">{currentTrack.artist}</p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-xs",
                    audioStatus === 'playing' ? 'bg-green-500/20 text-green-400' :
                    audioStatus === 'loading' ? 'bg-yellow-500/20 text-yellow-400' :
                    audioStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-dark-600 text-dark-300'
                  )}>
                    {audioStatus.charAt(0).toUpperCase() + audioStatus.slice(1)}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="w-full h-2 bg-dark-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <div className="flex justify-between text-xs text-dark-400 mt-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => skipTrack('prev')}
                    className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    disabled={audioStatus === 'loading' || audioStatus === 'error'}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                      audioStatus === 'playing' ? 'bg-purple-500' : 'bg-dark-600 hover:bg-dark-500'
                    )}
                  >
                    {audioStatus === 'loading' ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : audioStatus === 'playing' ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>

                  <button
                    onClick={() => skipTrack('next')}
                    className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-3 mt-4">
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
                    className="flex-1 h-2 bg-dark-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-sm text-dark-400 w-12 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-4">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Run All Tests Button */}
            <button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="btn-fire w-full flex items-center justify-center gap-2"
            >
              {isRunningTests ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Testing Audio Sources...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Run All Audio Tests
                </>
              )}
            </button>
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

          {/* Test Results Summary */}
          {testResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <h2 className="text-xl font-bold mb-4">Test Results</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {testResults.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-sm text-dark-400">Passed</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-red-400">
                    {testResults.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-dark-400">Failed</div>
                </div>
              </div>

              {testResults.filter(r => r.status === 'success').length === TEST_TRACKS.length && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  All audio tests passed! Your device is ready for battle.
                </div>
              )}

              {testResults.some(r => r.status === 'error') && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
                  <p className="font-medium mb-1">Troubleshooting tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-dark-300">
                    <li>Check your internet connection</li>
                    <li>Try a different browser (Chrome recommended)</li>
                    <li>Disable any ad blockers</li>
                    <li>Check if your device audio is muted</li>
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
