'use client'

import { useState, useCallback } from 'react'
import {
  useBattleReplayPlayer,
  BattleReplay,
  BattleEvent,
  formatReplayDuration,
} from '@/lib/hooks/useBattleReplay'
import { cn } from '@/lib/utils'

interface ReplayPlayerProps {
  replay: BattleReplay
  className?: string
}

export function ReplayPlayer({ replay, className }: ReplayPlayerProps) {
  const [phase, setPhase] = useState<string>('idle')
  const [currentRound, setCurrentRound] = useState(1)

  const handleEvent = useCallback((event: BattleEvent) => {
    switch (event.type) {
      case 'phase_change':
        setPhase(event.data.phase as string)
        break
      case 'round_start':
        setCurrentRound(event.data.round as number)
        break
    }
  }, [])

  const {
    isPlaying,
    isPaused,
    currentTime,
    duration,
    play,
    pause,
    stop,
    seek,
    playbackSpeed,
    setPlaybackSpeed,
  } = useBattleReplayPlayer(replay, handleEvent)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={cn('bg-zinc-900 rounded-xl p-6', className)}>
      {/* Battle Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="font-bold text-white">{replay.player1.username}</div>
            <div className="text-xs text-zinc-400">Player 1</div>
          </div>
          <div className="text-2xl font-bold text-zinc-500">VS</div>
          <div className="text-center">
            <div className="font-bold text-white">{replay.player2.username}</div>
            <div className="text-xs text-zinc-400">Player 2</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-400">
            Round {currentRound} of {replay.rounds}
          </div>
          <div className="text-xs text-purple-400 capitalize">{phase}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          className="w-full h-2 bg-zinc-800 rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const percentage = (e.clientX - rect.left) / rect.width
            seek(percentage * duration)
          }}
        >
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>{formatReplayDuration(currentTime)}</span>
          <span>{formatReplayDuration(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={stop}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label="Stop"
        >
          <StopIcon className="w-5 h-5" />
        </button>
        <button
          onClick={isPlaying && !isPaused ? pause : play}
          className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
          aria-label={isPlaying && !isPaused ? 'Pause' : 'Play'}
        >
          {isPlaying && !isPaused ? (
            <PauseIcon className="w-6 h-6" />
          ) : (
            <PlayIcon className="w-6 h-6" />
          )}
        </button>
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="bg-zinc-800 rounded-lg px-2 py-1 text-sm"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      {/* Winner Badge */}
      {replay.winner && (
        <div className="mt-4 text-center">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-full text-sm font-bold">
            Winner: {replay.winner === replay.player1.id ? replay.player1.username : replay.player2.username}
          </span>
        </div>
      )}
    </div>
  )
}

// Replay List Component
interface ReplayListProps {
  replays: BattleReplay[]
  onSelect: (replay: BattleReplay) => void
  onDelete?: (id: string) => void
  className?: string
}

export function ReplayList({ replays, onSelect, onDelete, className }: ReplayListProps) {
  if (replays.length === 0) {
    return (
      <div className={cn('text-center py-8 text-zinc-400', className)}>
        No replays available
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {replays.map((replay) => (
        <div
          key={replay.id}
          className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
          onClick={() => onSelect(replay)}
        >
          <div>
            <div className="font-medium text-white">
              {replay.player1.username} vs {replay.player2.username}
            </div>
            <div className="text-sm text-zinc-400">
              {replay.rounds} rounds • {formatReplayDuration(replay.duration)}
            </div>
            <div className="text-xs text-zinc-500">
              {new Date(replay.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {replay.winner && (
              <span className="text-xs text-yellow-500">
                {replay.winner === replay.player1.id ? replay.player1.username : replay.player2.username} won
              </span>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(replay.id)
                }}
                className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400"
                aria-label="Delete replay"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
