// Sound effects manager for the rap battle arena
// Uses Web Audio API for low-latency audio playback

type SoundName =
  | 'countdown'
  | 'round_start'
  | 'round_end'
  | 'victory'
  | 'defeat'
  | 'vote'
  | 'button_click'
  | 'notification'
  | 'error'
  | 'join'
  | 'leave'
  | 'chat_message'

interface SoundConfig {
  url: string
  volume: number
}

// Sound configurations - using placeholder URLs for demo
// In production, these would be actual audio files hosted on your server or CDN
const SOUNDS: Record<SoundName, SoundConfig> = {
  countdown: { url: '/sounds/countdown.mp3', volume: 0.7 },
  round_start: { url: '/sounds/round-start.mp3', volume: 0.8 },
  round_end: { url: '/sounds/round-end.mp3', volume: 0.8 },
  victory: { url: '/sounds/victory.mp3', volume: 0.9 },
  defeat: { url: '/sounds/defeat.mp3', volume: 0.7 },
  vote: { url: '/sounds/vote.mp3', volume: 0.5 },
  button_click: { url: '/sounds/click.mp3', volume: 0.3 },
  notification: { url: '/sounds/notification.mp3', volume: 0.5 },
  error: { url: '/sounds/error.mp3', volume: 0.5 },
  join: { url: '/sounds/join.mp3', volume: 0.5 },
  leave: { url: '/sounds/leave.mp3', volume: 0.4 },
  chat_message: { url: '/sounds/chat.mp3', volume: 0.3 },
}

class SoundManager {
  private audioContext: AudioContext | null = null
  private audioBuffers: Map<SoundName, AudioBuffer> = new Map()
  private enabled: boolean = true
  private masterVolume: number = 1.0
  private initialized: boolean = false

  constructor() {
    // Check for localStorage setting
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sound_enabled')
      this.enabled = stored !== 'false'

      const volume = localStorage.getItem('sound_volume')
      if (volume) {
        this.masterVolume = parseFloat(volume)
      }
    }
  }

  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }

    // Resume context if it was suspended (browser autoplay policies)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    return this.audioContext
  }

  async preload(sounds: SoundName[] = Object.keys(SOUNDS) as SoundName[]): Promise<void> {
    if (this.initialized) return

    const context = await this.getAudioContext()

    const loadPromises = sounds.map(async (name) => {
      try {
        const config = SOUNDS[name]
        const response = await fetch(config.url)
        if (!response.ok) {
          // Skip loading if file doesn't exist - we'll use fallback
          console.log(`Sound file not found: ${config.url}`)
          return
        }
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await context.decodeAudioData(arrayBuffer)
        this.audioBuffers.set(name, audioBuffer)
      } catch (error) {
        // Silently fail for missing sound files - we'll use synthesized sounds as fallback
        console.log(`Failed to load sound: ${name}`)
      }
    })

    await Promise.allSettled(loadPromises)
    this.initialized = true
  }

  async play(name: SoundName): Promise<void> {
    if (!this.enabled) return

    try {
      const context = await this.getAudioContext()
      const config = SOUNDS[name]

      // Check if we have a preloaded buffer
      const buffer = this.audioBuffers.get(name)

      if (buffer) {
        // Use preloaded audio
        const source = context.createBufferSource()
        const gainNode = context.createGain()

        source.buffer = buffer
        gainNode.gain.value = config.volume * this.masterVolume

        source.connect(gainNode)
        gainNode.connect(context.destination)

        source.start(0)
      } else {
        // Fallback to synthesized sounds
        this.playSynthesized(name, context)
      }
    } catch (error) {
      console.log('Error playing sound:', error)
    }
  }

  private playSynthesized(name: SoundName, context: AudioContext): void {
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const config = SOUNDS[name]

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)

    const volume = config.volume * this.masterVolume * 0.3 // Reduce synth volume

    switch (name) {
      case 'countdown':
        oscillator.frequency.value = 440 // A4
        gainNode.gain.setValueAtTime(volume, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.3)
        break

      case 'round_start':
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(523.25, context.currentTime) // C5
        oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.1) // E5
        oscillator.frequency.setValueAtTime(783.99, context.currentTime + 0.2) // G5
        gainNode.gain.setValueAtTime(volume, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.4)
        break

      case 'round_end':
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(783.99, context.currentTime) // G5
        oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.1) // E5
        oscillator.frequency.setValueAtTime(523.25, context.currentTime + 0.2) // C5
        gainNode.gain.setValueAtTime(volume, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.4)
        break

      case 'victory':
        // Triumphant fanfare
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(523.25, context.currentTime) // C5
        oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.15) // E5
        oscillator.frequency.setValueAtTime(783.99, context.currentTime + 0.3) // G5
        oscillator.frequency.setValueAtTime(1046.50, context.currentTime + 0.45) // C6
        gainNode.gain.setValueAtTime(volume, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.6)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.6)
        break

      case 'defeat':
        // Descending tones
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(440, context.currentTime) // A4
        oscillator.frequency.exponentialRampToValueAtTime(220, context.currentTime + 0.5)
        gainNode.gain.setValueAtTime(volume, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.5)
        break

      case 'vote':
      case 'button_click':
        oscillator.type = 'sine'
        oscillator.frequency.value = 600
        gainNode.gain.setValueAtTime(volume * 0.5, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.1)
        break

      case 'notification':
      case 'chat_message':
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, context.currentTime) // A5
        oscillator.frequency.setValueAtTime(1174.66, context.currentTime + 0.1) // D6
        gainNode.gain.setValueAtTime(volume * 0.3, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.2)
        break

      case 'error':
        oscillator.type = 'sawtooth'
        oscillator.frequency.value = 200
        gainNode.gain.setValueAtTime(volume, context.currentTime)
        gainNode.gain.setValueAtTime(volume * 0.5, context.currentTime + 0.1)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.2)
        break

      case 'join':
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(523.25, context.currentTime)
        oscillator.frequency.setValueAtTime(659.25, context.currentTime + 0.1)
        gainNode.gain.setValueAtTime(volume * 0.4, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.2)
        break

      case 'leave':
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(659.25, context.currentTime)
        oscillator.frequency.setValueAtTime(523.25, context.currentTime + 0.1)
        gainNode.gain.setValueAtTime(volume * 0.4, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2)
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.2)
        break
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound_enabled', String(enabled))
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound_volume', String(this.masterVolume))
    }
  }

  getVolume(): number {
    return this.masterVolume
  }
}

// Export a singleton instance
export const soundManager = new SoundManager()

// React hook for easy access in components
export function useSounds() {
  return {
    play: (name: SoundName) => soundManager.play(name),
    setEnabled: (enabled: boolean) => soundManager.setEnabled(enabled),
    isEnabled: () => soundManager.isEnabled(),
    setVolume: (volume: number) => soundManager.setVolume(volume),
    getVolume: () => soundManager.getVolume(),
    preload: () => soundManager.preload(),
  }
}
