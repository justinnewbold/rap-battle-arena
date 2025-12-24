'use client'

import { useState } from 'react'
import {
  useTrainingMode,
  TrainingDifficulty,
  TrainingFeedback,
  getTrainingStats,
} from '@/lib/hooks/useTrainingMode'
import { cn } from '@/lib/utils'

interface TrainingModeProps {
  className?: string
  onComplete?: () => void
}

export function TrainingMode({ className, onComplete }: TrainingModeProps) {
  const {
    session,
    isActive,
    currentRound,
    opponent,
    topic,
    startSession,
    endSession,
    availableTopics,
    setTopic,
  } = useTrainingMode()

  const [selectedDifficulty, setSelectedDifficulty] =
    useState<TrainingDifficulty>('medium')
  const [rounds, setRounds] = useState(3)

  if (isActive && session && opponent) {
    return (
      <TrainingBattle
        session={session}
        currentRound={currentRound}
        opponent={opponent}
        onEnd={() => {
          endSession()
          onComplete?.()
        }}
        className={className}
      />
    )
  }

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        Training Mode
      </h2>

      {/* Difficulty Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Select Difficulty
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['easy', 'medium', 'hard', 'expert'] as TrainingDifficulty[]).map(
            (diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={cn(
                  'p-3 rounded-lg border-2 transition-colors capitalize',
                  selectedDifficulty === diff
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-zinc-700 hover:border-zinc-600 text-zinc-400'
                )}
              >
                {diff}
              </button>
            )
          )}
        </div>
      </div>

      {/* Topic Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Select Topic
        </label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        >
          {availableTopics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Rounds Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Number of Rounds: {rounds}
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={rounds}
          onChange={(e) => setRounds(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
      </div>

      {/* Opponent Preview */}
      <div className="mb-8 p-4 bg-zinc-900 rounded-lg">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Your Opponent</h3>
        <OpponentCard difficulty={selectedDifficulty} />
      </div>

      {/* Start Button */}
      <button
        onClick={() => startSession(selectedDifficulty, rounds)}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-lg transition-colors"
      >
        Start Training
      </button>

      {/* Stats */}
      <TrainingStats className="mt-8" />
    </div>
  )
}

// Opponent Card
function OpponentCard({ difficulty }: { difficulty: TrainingDifficulty }) {
  const opponents: Record<
    TrainingDifficulty,
    { name: string; style: string; color: string }
  > = {
    easy: {
      name: 'Rookie Bot',
      style: 'Simple rhymes and basic flow',
      color: 'from-green-500 to-green-600',
    },
    medium: {
      name: 'Flow Master',
      style: 'Consistent rhythm with creative wordplay',
      color: 'from-blue-500 to-blue-600',
    },
    hard: {
      name: 'Lyrical Phoenix',
      style: 'Complex rhyme schemes and metaphors',
      color: 'from-orange-500 to-orange-600',
    },
    expert: {
      name: 'Emcee Supreme',
      style: 'Multi-syllabic rhymes and devastating punchlines',
      color: 'from-red-500 to-red-600',
    },
  }

  const opponent = opponents[difficulty]

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'w-16 h-16 rounded-full bg-gradient-to-r flex items-center justify-center text-2xl',
          opponent.color
        )}
      >
        🤖
      </div>
      <div>
        <div className="font-bold text-white">{opponent.name}</div>
        <div className="text-sm text-zinc-400">{opponent.style}</div>
      </div>
    </div>
  )
}

// Training Battle
function TrainingBattle({
  session,
  currentRound,
  opponent,
  onEnd,
  className,
}: {
  session: { rounds: number }
  currentRound: number
  opponent: { name: string; avatar: string }
  onEnd: () => void
  className?: string
}) {
  const [phase, setPhase] = useState<'ready' | 'recording' | 'feedback'>('ready')
  const [feedback, setFeedback] = useState<TrainingFeedback | null>(null)

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-sm text-zinc-400">Round</span>
          <span className="text-2xl font-bold text-white ml-2">
            {currentRound}/{session.rounds}
          </span>
        </div>
        <button
          onClick={onEnd}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
        >
          End Session
        </button>
      </div>

      {/* Opponent Display */}
      <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-lg mb-6">
        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-xl">
          🤖
        </div>
        <div>
          <div className="font-bold text-white">{opponent.name}</div>
          <div className="text-sm text-purple-400">AI Opponent</div>
        </div>
      </div>

      {/* Phase Content */}
      {phase === 'ready' && (
        <div className="text-center py-12">
          <h3 className="text-xl font-bold mb-4">Get Ready!</h3>
          <p className="text-zinc-400 mb-8">
            Press the button below when you&apos;re ready to start rapping
          </p>
          <button
            onClick={() => setPhase('recording')}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-full font-bold text-lg animate-pulse"
          >
            Start Recording
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
            <MicIcon className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-bold mb-4 text-red-400">Recording...</h3>
          <p className="text-zinc-400 mb-8">Drop your bars!</p>
          <button
            onClick={() => {
              // Simulate feedback
              setFeedback({
                overallScore: 75,
                flowScore: 80,
                rhymeScore: 70,
                deliveryScore: 75,
                tips: ['Try more internal rhymes'],
                strongPoints: ['Great energy'],
                areasToImprove: ['Work on breath control'],
              })
              setPhase('feedback')
            }}
            className="px-8 py-4 bg-zinc-700 hover:bg-zinc-600 rounded-full font-bold"
          >
            Stop Recording
          </button>
        </div>
      )}

      {phase === 'feedback' && feedback && (
        <FeedbackDisplay
          feedback={feedback}
          onContinue={() => {
            setPhase('ready')
            setFeedback(null)
          }}
          isLastRound={currentRound >= session.rounds}
          onEnd={onEnd}
        />
      )}
    </div>
  )
}

// Feedback Display
function FeedbackDisplay({
  feedback,
  onContinue,
  isLastRound,
  onEnd,
}: {
  feedback: TrainingFeedback
  onContinue: () => void
  isLastRound: boolean
  onEnd: () => void
}) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6">
      <h3 className="text-xl font-bold text-center mb-6">Round Feedback</h3>

      {/* Score Display */}
      <div className="text-center mb-6">
        <div className="text-5xl font-bold text-purple-400 mb-2">
          {feedback.overallScore}
        </div>
        <div className="text-zinc-400">Overall Score</div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <ScoreCard label="Flow" score={feedback.flowScore} />
        <ScoreCard label="Rhymes" score={feedback.rhymeScore} />
        <ScoreCard label="Delivery" score={feedback.deliveryScore} />
      </div>

      {/* Feedback Lists */}
      <div className="space-y-4 mb-6">
        <FeedbackList
          title="Strong Points"
          items={feedback.strongPoints}
          icon="✅"
        />
        <FeedbackList
          title="Areas to Improve"
          items={feedback.areasToImprove}
          icon="💡"
        />
        <FeedbackList title="Tips" items={feedback.tips} icon="📝" />
      </div>

      {/* Continue/End */}
      <button
        onClick={isLastRound ? onEnd : onContinue}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold"
      >
        {isLastRound ? 'Complete Training' : 'Next Round'}
      </button>
    </div>
  )
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color =
    score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="text-center p-3 bg-zinc-800 rounded-lg">
      <div className={cn('text-2xl font-bold', color)}>{score}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  )
}

function FeedbackList({
  title,
  items,
  icon,
}: {
  title: string
  items: string[]
  icon: string
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-zinc-400 mb-2">{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span>{icon}</span>
            <span className="text-zinc-300">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Training Stats
function TrainingStats({ className }: { className?: string }) {
  const stats = getTrainingStats()

  if (stats.totalSessions === 0) {
    return null
  }

  return (
    <div className={cn('p-4 bg-zinc-900 rounded-lg', className)}>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">Your Stats</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {stats.totalSessions}
          </div>
          <div className="text-xs text-zinc-400">Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {stats.averageScore}
          </div>
          <div className="text-xs text-zinc-400">Avg Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {stats.bestScore}
          </div>
          <div className="text-xs text-zinc-400">Best Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {stats.totalRounds}
          </div>
          <div className="text-xs text-zinc-400">Rounds</div>
        </div>
      </div>
    </div>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )
}
