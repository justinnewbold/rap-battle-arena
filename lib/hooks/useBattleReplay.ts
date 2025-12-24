'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// Battle event types for replay
export type BattleEventType =
  | 'phase_change'
  | 'recording_start'
  | 'recording_end'
  | 'audio_chunk'
  | 'vote'
  | 'chat_message'
  | 'player_join'
  | 'player_leave'
  | 'round_start'
  | 'round_end'
  | 'battle_end'

export interface BattleEvent {
  type: BattleEventType
  timestamp: number
  data: Record<string, unknown>
}

export interface BattleReplay {
  id: string
  battleId: string
  player1: {
    id: string
    username: string
  }
  player2: {
    id: string
    username: string
  }
  winner?: string
  duration: number
  rounds: number
  events: BattleEvent[]
  audioTracks: {
    playerId: string
    round: number
    url: string
    duration: number
  }[]
  createdAt: string
}

interface UseBattleReplayRecorderReturn {
  isRecording: boolean
  events: BattleEvent[]
  startRecording: () => void
  stopRecording: () => BattleEvent[]
  recordEvent: (type: BattleEventType, data: Record<string, unknown>) => void
  clearEvents: () => void
}

// Hook for recording battle events
export function useBattleReplayRecorder(): UseBattleReplayRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const eventsRef = useRef<BattleEvent[]>([])
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(() => {
    eventsRef.current = []
    startTimeRef.current = Date.now()
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    return eventsRef.current
  }, [])

  const recordEvent = useCallback(
    (type: BattleEventType, data: Record<string, unknown>) => {
      if (!isRecording) return

      eventsRef.current.push({
        type,
        timestamp: Date.now() - startTimeRef.current,
        data,
      })
    },
    [isRecording]
  )

  const clearEvents = useCallback(() => {
    eventsRef.current = []
  }, [])

  return {
    isRecording,
    events: eventsRef.current,
    startRecording,
    stopRecording,
    recordEvent,
    clearEvents,
  }
}

interface UseBattleReplayPlayerReturn {
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  currentEvent: BattleEvent | null
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  setPlaybackSpeed: (speed: number) => void
  playbackSpeed: number
}

// Hook for playing back battle replays
export function useBattleReplayPlayer(
  replay: BattleReplay | null,
  onEvent?: (event: BattleEvent) => void
): UseBattleReplayPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentEvent, setCurrentEvent] = useState<BattleEvent | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const eventIndexRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)

  const duration = replay?.duration || 0

  const processEvents = useCallback(
    (time: number) => {
      if (!replay) return

      // Find events that should have triggered by this time
      while (
        eventIndexRef.current < replay.events.length &&
        replay.events[eventIndexRef.current].timestamp <= time
      ) {
        const event = replay.events[eventIndexRef.current]
        setCurrentEvent(event)
        onEvent?.(event)
        eventIndexRef.current++
      }
    },
    [replay, onEvent]
  )

  const tick = useCallback(
    (timestamp: number) => {
      if (!isPlaying || isPaused || !replay) return

      const deltaTime = timestamp - lastFrameTimeRef.current
      lastFrameTimeRef.current = timestamp

      setCurrentTime((prev) => {
        const newTime = prev + deltaTime * playbackSpeed

        if (newTime >= duration) {
          setIsPlaying(false)
          setIsPaused(false)
          return duration
        }

        processEvents(newTime)
        return newTime
      })

      animationFrameRef.current = requestAnimationFrame(tick)
    },
    [isPlaying, isPaused, replay, duration, playbackSpeed, processEvents]
  )

  const play = useCallback(() => {
    if (!replay) return

    if (isPaused) {
      setIsPaused(false)
    } else {
      eventIndexRef.current = 0
      setCurrentTime(0)
    }

    setIsPlaying(true)
    lastFrameTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(tick)
  }, [replay, isPaused, tick])

  const pause = useCallback(() => {
    setIsPaused(true)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    setCurrentEvent(null)
    eventIndexRef.current = 0
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  const seek = useCallback(
    (time: number) => {
      if (!replay) return

      const clampedTime = Math.max(0, Math.min(time, duration))
      setCurrentTime(clampedTime)

      // Find the event index for this time
      let index = 0
      while (
        index < replay.events.length &&
        replay.events[index].timestamp <= clampedTime
      ) {
        index++
      }
      eventIndexRef.current = index

      // Set current event
      if (index > 0) {
        setCurrentEvent(replay.events[index - 1])
      }
    },
    [replay, duration]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    isPlaying,
    isPaused,
    currentTime,
    duration,
    currentEvent,
    play,
    pause,
    stop,
    seek,
    setPlaybackSpeed,
    playbackSpeed,
  }
}

// Save replay to storage
export async function saveReplay(replay: BattleReplay): Promise<void> {
  // In a real app, this would save to Supabase
  // For now, save to localStorage as demo
  const replays = JSON.parse(localStorage.getItem('battle_replays') || '[]')
  replays.push(replay)
  localStorage.setItem('battle_replays', JSON.stringify(replays))
}

// Load replays from storage
export async function loadReplays(): Promise<BattleReplay[]> {
  // In a real app, this would load from Supabase
  const replays = JSON.parse(localStorage.getItem('battle_replays') || '[]')
  return replays
}

// Load single replay
export async function loadReplay(id: string): Promise<BattleReplay | null> {
  const replays = await loadReplays()
  return replays.find((r) => r.id === id) || null
}

// Delete replay
export async function deleteReplay(id: string): Promise<void> {
  const replays = await loadReplays()
  const filtered = replays.filter((r) => r.id !== id)
  localStorage.setItem('battle_replays', JSON.stringify(filtered))
}

// Format duration for display
export function formatReplayDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
