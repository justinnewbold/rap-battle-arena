'use client'

import { useState, useCallback, useRef } from 'react'

export type TrainingDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface TrainingFeedback {
  overallScore: number
  flowScore: number
  rhymeScore: number
  deliveryScore: number
  tips: string[]
  strongPoints: string[]
  areasToImprove: string[]
}

export interface TrainingSession {
  id: string
  difficulty: TrainingDifficulty
  topic: string
  rounds: number
  startedAt: string
  completedAt?: string
  userScores: number[]
  aiScores: number[]
  feedback: TrainingFeedback[]
}

interface AIOpponent {
  name: string
  avatar: string
  style: string
  difficulty: TrainingDifficulty
}

const AI_OPPONENTS: Record<TrainingDifficulty, AIOpponent> = {
  easy: {
    name: 'Rookie Bot',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=rookie',
    style: 'Simple rhymes and basic flow',
    difficulty: 'easy',
  },
  medium: {
    name: 'Flow Master',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=flowmaster',
    style: 'Consistent rhythm with creative wordplay',
    difficulty: 'medium',
  },
  hard: {
    name: 'Lyrical Phoenix',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=phoenix',
    style: 'Complex rhyme schemes and metaphors',
    difficulty: 'hard',
  },
  expert: {
    name: 'Emcee Supreme',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=supreme',
    style: 'Multi-syllabic rhymes, double entendres, and devastating punchlines',
    difficulty: 'expert',
  },
}

const TRAINING_TOPICS = [
  'Street life',
  'Success and hustle',
  'Technology',
  'Love and relationships',
  'Social commentary',
  'Personal growth',
  'Battle diss',
  'Freestyle about yourself',
]

interface UseTrainingModeReturn {
  session: TrainingSession | null
  isActive: boolean
  currentRound: number
  opponent: AIOpponent | null
  topic: string
  startSession: (difficulty: TrainingDifficulty, rounds?: number) => void
  endSession: () => void
  submitRound: (audioBlob: Blob) => Promise<TrainingFeedback>
  getAIResponse: () => Promise<string>
  availableTopics: string[]
  setTopic: (topic: string) => void
}

export function useTrainingMode(): UseTrainingModeReturn {
  const [session, setSession] = useState<TrainingSession | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [opponent, setOpponent] = useState<AIOpponent | null>(null)
  const [topic, setTopic] = useState(TRAINING_TOPICS[0])

  const sessionRef = useRef<TrainingSession | null>(null)

  const startSession = useCallback(
    (difficulty: TrainingDifficulty, rounds: number = 3) => {
      const newSession: TrainingSession = {
        id: `training-${Date.now()}`,
        difficulty,
        topic,
        rounds,
        startedAt: new Date().toISOString(),
        userScores: [],
        aiScores: [],
        feedback: [],
      }

      sessionRef.current = newSession
      setSession(newSession)
      setOpponent(AI_OPPONENTS[difficulty])
      setCurrentRound(1)
      setIsActive(true)
    },
    [topic]
  )

  const endSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.completedAt = new Date().toISOString()
      // Save to localStorage for history
      try {
        const stored = localStorage.getItem('training_history')
        const history: TrainingSession[] = stored ? JSON.parse(stored) : []
        history.push(sessionRef.current)
        localStorage.setItem('training_history', JSON.stringify(history))
      } catch (error) {
        console.error('Failed to save training history:', error)
      }
    }

    setSession(null)
    setIsActive(false)
    setCurrentRound(1)
    setOpponent(null)
    sessionRef.current = null
  }, [])

  const submitRound = useCallback(
    async (_audioBlob: Blob): Promise<TrainingFeedback> => {
      // In a real implementation, this would:
      // 1. Transcribe the audio using Whisper
      // 2. Analyze the lyrics using GPT-4
      // 3. Return structured feedback

      // For demo, simulate AI feedback
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const difficultyMultiplier = {
        easy: 1.2,
        medium: 1.0,
        hard: 0.85,
        expert: 0.7,
      }

      const baseScore = 60 + Math.random() * 30
      const multiplier = difficultyMultiplier[opponent?.difficulty || 'medium']
      const adjustedScore = Math.min(100, baseScore * multiplier)

      const feedback: TrainingFeedback = {
        overallScore: Math.round(adjustedScore),
        flowScore: Math.round(adjustedScore + (Math.random() - 0.5) * 20),
        rhymeScore: Math.round(adjustedScore + (Math.random() - 0.5) * 20),
        deliveryScore: Math.round(adjustedScore + (Math.random() - 0.5) * 20),
        tips: [
          'Try varying your flow pattern more',
          'Use more internal rhymes to enhance complexity',
          'Work on breath control for longer bars',
        ],
        strongPoints: [
          'Good use of metaphors',
          'Strong delivery confidence',
          'Creative wordplay',
        ],
        areasToImprove: [
          'Rhyme density could be higher',
          'Consider adding more punchlines',
          'Work on syllable matching in bars',
        ],
      }

      // Update session
      if (sessionRef.current) {
        sessionRef.current.userScores.push(feedback.overallScore)
        sessionRef.current.feedback.push(feedback)
        setSession({ ...sessionRef.current })
      }

      // Advance round
      if (session && currentRound < session.rounds) {
        setCurrentRound((prev) => prev + 1)
      } else {
        // Session complete
        endSession()
      }

      return feedback
    },
    [session, currentRound, opponent, endSession]
  )

  const getAIResponse = useCallback(async (): Promise<string> => {
    // In a real implementation, this would call GPT-4 to generate
    // AI opponent lyrics based on the difficulty and topic

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const responses: Record<TrainingDifficulty, string[]> = {
      easy: [
        "I'm the rookie bot, learning every day, stepping to the mic, got something to say",
        "Simple bars but I'm getting better, practice makes perfect, letter by letter",
      ],
      medium: [
        "Flow Master's here, rhythm so clean, sharpest wordplay that you've ever seen",
        "Metaphors stacking, similes too, every bar I spit coming straight at you",
      ],
      hard: [
        "Lyrical Phoenix rising from the flames, complex rhyme schemes, you can't say the same",
        "Multi-syllabic, intricate design, every punchline hits right on time",
      ],
      expert: [
        "Emcee Supreme, legends know my name, triple entendres in every frame",
        "Wordsmith supreme with the verbal assault, if your bars can't match, that's nobody's fault",
      ],
    }

    const difficulty = opponent?.difficulty || 'medium'
    const options = responses[difficulty]
    return options[Math.floor(Math.random() * options.length)]
  }, [opponent])

  return {
    session,
    isActive,
    currentRound,
    opponent,
    topic,
    startSession,
    endSession,
    submitRound,
    getAIResponse,
    availableTopics: TRAINING_TOPICS,
    setTopic,
  }
}

// Load training history
export function getTrainingHistory(): TrainingSession[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('training_history')
    if (!stored) return []
    return JSON.parse(stored) as TrainingSession[]
  } catch (error) {
    console.error('Failed to load training history:', error)
    return []
  }
}

// Get training stats
export function getTrainingStats() {
  const history = getTrainingHistory()

  if (history.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      bestScore: 0,
      totalRounds: 0,
      favoriteTopics: [],
    }
  }

  const allScores = history.flatMap((s) => s.userScores)
  const topicCounts = history.reduce(
    (acc, s) => {
      acc[s.topic] = (acc[s.topic] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalSessions: history.length,
    averageScore: Math.round(
      allScores.reduce((a, b) => a + b, 0) / allScores.length
    ),
    bestScore: Math.max(...allScores),
    totalRounds: allScores.length,
    favoriteTopics: Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic),
  }
}
