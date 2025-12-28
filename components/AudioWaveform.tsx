'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface AudioWaveformProps {
  isRecording: boolean
  className?: string
  barCount?: number
  color?: 'fire' | 'ice' | 'gold'
}

const colorMap = {
  fire: '#f97316',
  ice: '#06b6d4',
  gold: '#eab308',
}

export function AudioWaveform({
  isRecording,
  className,
  barCount = 32,
  color = 'fire',
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [_isActive, setIsActive] = useState(false)

  const startVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()

      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8

      source.connect(analyser)

      analyserRef.current = analyser
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)

      setIsActive(true)
      draw()
    } catch (error) {
      console.error('Failed to start audio visualization:', error)
    }
  }, [])

  const stopVisualization = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    analyserRef.current = null
    dataArrayRef.current = null
    setIsActive(false)

    // Clear canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current

    if (!canvas || !analyser || !dataArray) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    animationRef.current = requestAnimationFrame(draw)

    // Use type assertion for TypeScript 5.5+ compatibility
    analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>)

    const width = canvas.width
    const height = canvas.height
    const barWidth = width / barCount
    const gap = 2

    ctx.clearRect(0, 0, width, height)

    // Sample data points evenly across the frequency range
    const step = Math.floor(dataArray.length / barCount)

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step]
      const normalizedValue = value / 255
      const barHeight = Math.max(4, normalizedValue * height * 0.9)

      const x = i * barWidth + gap / 2
      const y = (height - barHeight) / 2

      // Create gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
      gradient.addColorStop(0, colorMap[color])
      gradient.addColorStop(0.5, colorMap[color])
      gradient.addColorStop(1, `${colorMap[color]}80`)

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth - gap, barHeight, 2)
      ctx.fill()
    }
  }, [barCount, color])

  useEffect(() => {
    if (isRecording) {
      startVisualization()
    } else {
      stopVisualization()
    }

    return () => {
      stopVisualization()
    }
  }, [isRecording, startVisualization, stopVisualization])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={64}
      className={cn('rounded-lg', className)}
    />
  )
}

// Static waveform for playback visualization
interface StaticWaveformProps {
  audioUrl: string
  progress?: number
  className?: string
  color?: 'fire' | 'ice' | 'gold'
}

export function StaticWaveform({
  audioUrl,
  progress = 0,
  className,
  color = 'fire',
}: StaticWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])

  useEffect(() => {
    let isMounted = true
    const audioContextRef: { current: AudioContext | null } = { current: null }

    async function generateWaveform() {
      try {
        const response = await fetch(audioUrl)

        // Check if response is successful
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()

        // Check if component is still mounted before proceeding
        if (!isMounted) return

        const audioContext = new AudioContext()
        audioContextRef.current = audioContext
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        // Check again after async operation
        if (!isMounted) {
          audioContext.close()
          return
        }

        const rawData = audioBuffer.getChannelData(0)
        const samples = 64
        const blockSize = Math.floor(rawData.length / samples)
        const filteredData: number[] = []

        for (let i = 0; i < samples; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j])
          }
          filteredData.push(sum / blockSize)
        }

        // Normalize
        const max = Math.max(...filteredData)
        const normalized = filteredData.map(v => v / max)

        if (isMounted) {
          setWaveformData(normalized)
        }
      } catch (error) {
        console.error('Failed to generate waveform:', error)
      }
    }

    if (audioUrl) {
      generateWaveform()
    }

    return () => {
      isMounted = false
      // Clean up audio context if it was created
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [audioUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const barCount = waveformData.length
    const barWidth = width / barCount
    const gap = 2
    const progressX = progress * width

    ctx.clearRect(0, 0, width, height)

    waveformData.forEach((value, i) => {
      const barHeight = Math.max(4, value * height * 0.9)
      const x = i * barWidth + gap / 2
      const y = (height - barHeight) / 2

      // Color based on progress
      if (x < progressX) {
        ctx.fillStyle = colorMap[color]
      } else {
        ctx.fillStyle = `${colorMap[color]}40`
      }

      ctx.beginPath()
      ctx.roundRect(x, y, barWidth - gap, barHeight, 2)
      ctx.fill()
    })
  }, [waveformData, progress, color])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className={cn('rounded-lg', className)}
    />
  )
}
