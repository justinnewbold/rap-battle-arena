// Web Audio API Beat Generator
// Generates procedural beats that work without external audio files

export type BeatStyle = 'hiphop' | 'trap' | 'boom' | 'chill' | 'aggressive' | 'oldschool' | 'drill' | 'rnb' | 'grime' | 'jersey'

export interface BeatPattern {
  name: string
  bpm: number
  style: BeatStyle
}

export const BEAT_PATTERNS: BeatPattern[] = [
  // Hip-Hop
  { name: 'Street Heat', bpm: 90, style: 'hiphop' },
  { name: 'Deep Urban', bpm: 92, style: 'hiphop' },
  { name: 'Block Party', bpm: 94, style: 'hiphop' },

  // Trap
  { name: 'Underground Flow', bpm: 88, style: 'trap' },
  { name: 'Game On', bpm: 130, style: 'trap' },
  { name: 'Dark Mode', bpm: 140, style: 'trap' },

  // Boom Bap
  { name: 'Lo-Fi Chill', bpm: 75, style: 'boom' },
  { name: 'Golden Era', bpm: 90, style: 'boom' },
  { name: 'Dusty Vinyl', bpm: 86, style: 'boom' },

  // Chill
  { name: 'Night Vibes', bpm: 85, style: 'chill' },
  { name: 'Dream State', bpm: 78, style: 'chill' },
  { name: 'Sunset Drive', bpm: 82, style: 'chill' },

  // Aggressive
  { name: 'Battle Ready', bpm: 95, style: 'aggressive' },
  { name: 'No Mercy', bpm: 100, style: 'aggressive' },
  { name: 'War Zone', bpm: 110, style: 'aggressive' },

  // Old School
  { name: 'Classic Break', bpm: 96, style: 'oldschool' },
  { name: '808 Dreams', bpm: 98, style: 'oldschool' },

  // UK Drill
  { name: 'London Nights', bpm: 140, style: 'drill' },
  { name: 'Cold Streets', bpm: 142, style: 'drill' },

  // R&B
  { name: 'Smooth Operator', bpm: 72, style: 'rnb' },
  { name: 'Late Night', bpm: 68, style: 'rnb' },

  // Grime
  { name: 'Eskimo', bpm: 140, style: 'grime' },
  { name: 'East London', bpm: 138, style: 'grime' },

  // Jersey Club
  { name: 'Club Bounce', bpm: 130, style: 'jersey' },
  { name: 'Jersey Flex', bpm: 135, style: 'jersey' },
]

class BeatGenerator {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isPlaying = false
  private intervalId: number | null = null
  private currentBeat = 0
  private scheduledNodes: AudioNode[] = []

  constructor() {}

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.5
      this.masterGain.connect(this.audioContext.destination)
    }
    return this.audioContext
  }

  private playKick(time: number) {
    const ctx = this.getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, time)
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1)

    gain.gain.setValueAtTime(1, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(time)
    osc.stop(time + 0.3)
  }

  private playSnare(time: number) {
    const ctx = this.getContext()

    // Noise component
    const bufferSize = ctx.sampleRate * 0.1
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.value = 1000

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.8, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.masterGain!)

    // Tone component
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(200, time)
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05)
    oscGain.gain.setValueAtTime(0.5, time)
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1)

    osc.connect(oscGain)
    oscGain.connect(this.masterGain!)

    noise.start(time)
    noise.stop(time + 0.15)
    osc.start(time)
    osc.stop(time + 0.1)
  }

  private playHiHat(time: number, open = false) {
    const ctx = this.getContext()

    const bufferSize = ctx.sampleRate * (open ? 0.15 : 0.05)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 7000

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.15 : 0.05))

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)

    noise.start(time)
    noise.stop(time + (open ? 0.15 : 0.05))
  }

  private play808(time: number, note = 40) {
    const ctx = this.getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(note, time)
    osc.frequency.exponentialRampToValueAtTime(note * 0.5, time + 0.4)

    gain.gain.setValueAtTime(0.8, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5)

    osc.connect(gain)
    gain.connect(this.masterGain!)

    osc.start(time)
    osc.stop(time + 0.5)
  }

  private getPattern(style: string): number[][] {
    // Returns [kick, snare, hihat, 808] patterns for 16 steps
    switch (style) {
      case 'hiphop':
        return [
          [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // kick
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // hihat
          [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // 808
        ]
      case 'trap':
        return [
          [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0], // kick
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // hihat (fast)
          [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], // 808
        ]
      case 'boom':
        return [
          [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], // kick
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // hihat (sparse)
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // no 808
        ]
      case 'chill':
        return [
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], // kick
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // hihat
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // no 808
        ]
      case 'aggressive':
        return [
          [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0], // kick (busy)
          [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1], // snare
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // hihat (constant)
          [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0], // 808
        ]
      case 'oldschool':
        return [
          [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0], // kick with pickup
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // hihat
          [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // 808
        ]
      case 'drill':
        return [
          [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], // kick (sliding)
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1], // hihat (triplet feel)
          [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], // 808 slides
        ]
      case 'rnb':
        return [
          [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // kick (minimal)
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // hihat (smooth)
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // no 808
        ]
      case 'grime':
        return [
          [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // kick
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1], // hihat (syncopated)
          [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1], // 808
        ]
      case 'jersey':
        return [
          [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], // kick (bouncy)
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // hihat (constant)
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // no 808
        ]
      default:
        return [
          [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
          [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ]
    }
  }

  start(pattern: BeatPattern) {
    if (this.isPlaying) {
      this.stop()
    }

    const ctx = this.getContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    this.isPlaying = true
    this.currentBeat = 0

    const [kickPattern, snarePattern, hihatPattern, bassPattern] = this.getPattern(pattern.style)
    const stepDuration = (60 / pattern.bpm) / 4 // 16th notes

    const scheduleNext = () => {
      if (!this.isPlaying) return

      const now = ctx.currentTime
      const step = this.currentBeat % 16

      if (kickPattern[step]) this.playKick(now)
      if (snarePattern[step]) this.playSnare(now)
      if (hihatPattern[step]) this.playHiHat(now, step % 8 === 0)
      if (bassPattern[step]) this.play808(now)

      this.currentBeat++
    }

    scheduleNext()
    this.intervalId = window.setInterval(scheduleNext, stepDuration * 1000)
  }

  stop() {
    this.isPlaying = false
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.currentBeat = 0
  }

  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying
  }

  destroy() {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
      this.masterGain = null
    }
  }
}

// Singleton instance
let beatGeneratorInstance: BeatGenerator | null = null

export function getBeatGenerator(): BeatGenerator {
  if (!beatGeneratorInstance) {
    beatGeneratorInstance = new BeatGenerator()
  }
  return beatGeneratorInstance
}

// React hook for beat generator
import { useState, useEffect, useCallback } from 'react'

export function useBeatGenerator() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPattern, setCurrentPattern] = useState<BeatPattern | null>(null)

  const generator = getBeatGenerator()

  const play = useCallback((pattern: BeatPattern) => {
    generator.start(pattern)
    setIsPlaying(true)
    setCurrentPattern(pattern)
  }, [generator])

  const stop = useCallback(() => {
    generator.stop()
    setIsPlaying(false)
    setCurrentPattern(null)
  }, [generator])

  const toggle = useCallback((pattern: BeatPattern) => {
    if (isPlaying && currentPattern?.name === pattern.name) {
      stop()
    } else {
      play(pattern)
    }
  }, [isPlaying, currentPattern, play, stop])

  const setVolume = useCallback((volume: number) => {
    generator.setVolume(volume)
  }, [generator])

  useEffect(() => {
    return () => {
      generator.stop()
    }
  }, [generator])

  return {
    isPlaying,
    currentPattern,
    play,
    stop,
    toggle,
    setVolume,
    patterns: BEAT_PATTERNS,
  }
}
