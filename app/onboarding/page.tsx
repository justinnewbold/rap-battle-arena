'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Swords, Trophy, Users, Star, ArrowRight, ArrowLeft,
  ChevronRight, Award, Play, Volume2
} from 'lucide-react'
import { useTutorialStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'

interface TutorialStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  details: string[]
  tip?: string
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Rap Battle Arena',
    description: 'The ultimate platform for AI-judged rap battles',
    icon: <Mic className="w-16 h-16" />,
    color: 'fire',
    details: [
      'Battle rappers from around the world',
      'Get judged by advanced AI on flow, rhymes, and punchlines',
      'Climb the leaderboard and earn your reputation'
    ],
    tip: 'Pro tip: Practice makes perfect. Use Practice Mode before your first battle!'
  },
  {
    id: 'battles',
    title: 'How Battles Work',
    description: 'Learn the flow of a rap battle',
    icon: <Swords className="w-16 h-16" />,
    color: 'gold',
    details: [
      'Each battle has multiple rounds (usually 2-3)',
      'Players take turns recording their verses',
      'You have limited time per verse (30-90 seconds)',
      'AI judges score based on flow, rhymes, wordplay, and delivery'
    ],
    tip: 'Stay on beat and make your punchlines hit hard!'
  },
  {
    id: 'recording',
    title: 'Recording Your Verse',
    description: 'Drop your hottest bars',
    icon: <Volume2 className="w-16 h-16" />,
    color: 'ice',
    details: [
      'Choose your beat before the battle starts',
      'When it\'s your turn, press the mic button to record',
      'The beat plays while you rap - stay on rhythm',
      'Your verse is automatically submitted when time runs out'
    ],
    tip: 'Use headphones to hear the beat clearly while recording!'
  },
  {
    id: 'scoring',
    title: 'How Scoring Works',
    description: 'What the AI judges look for',
    icon: <Star className="w-16 h-16" />,
    color: 'purple',
    details: [
      'Flow (25%): Rhythm, timing, and delivery',
      'Rhymes (25%): Rhyme schemes and complexity',
      'Punchlines (25%): Wordplay and impact',
      'Delivery (25%): Confidence and style'
    ],
    tip: 'Balance all four categories for the best scores!'
  },
  {
    id: 'ranking',
    title: 'ELO Rating System',
    description: 'Climb the ranks',
    icon: <Trophy className="w-16 h-16" />,
    color: 'gold',
    details: [
      'Start at 1000 ELO rating',
      'Win battles to gain ELO, lose to drop',
      'Beat higher-ranked opponents for more points',
      'Top players appear on the global leaderboard'
    ],
    tip: 'Challenge stronger opponents to climb faster!'
  },
  {
    id: 'social',
    title: 'Social Features',
    description: 'Connect with the community',
    icon: <Users className="w-16 h-16" />,
    color: 'fire',
    details: [
      'Add friends and challenge them to battles',
      'Join or create crews for team battles',
      'Spectate live battles and vote',
      'Chat with the community'
    ],
    tip: 'Build your crew and dominate the arena together!'
  },
  {
    id: 'tournaments',
    title: 'Tournaments',
    description: 'Compete for glory',
    icon: <Award className="w-16 h-16" />,
    color: 'gold',
    details: [
      'Join weekly and special tournaments',
      'Bracket-style elimination battles',
      'Win exclusive badges and bragging rights',
      'Spectators can watch and vote'
    ],
    tip: 'Tournaments are the fastest way to make a name for yourself!'
  },
  {
    id: 'ready',
    title: 'You\'re Ready!',
    description: 'Time to show what you got',
    icon: <Play className="w-16 h-16" />,
    color: 'fire',
    details: [
      'Start with Practice Mode to warm up',
      'Join Quick Match when you\'re ready',
      'Check out the Leaderboard to see top players',
      'Have fun and respect your opponents!'
    ],
    tip: 'Remember: Every battle is a chance to improve. Now go show them what you got!'
  }
]

function getColorClasses(color: string) {
  switch (color) {
    case 'fire':
      return {
        bg: 'bg-fire-500/20',
        text: 'text-fire-400',
        border: 'border-fire-500',
        gradient: 'from-fire-500 to-fire-600'
      }
    case 'ice':
      return {
        bg: 'bg-ice-500/20',
        text: 'text-ice-400',
        border: 'border-ice-500',
        gradient: 'from-ice-500 to-ice-600'
      }
    case 'gold':
      return {
        bg: 'bg-gold-500/20',
        text: 'text-gold-400',
        border: 'border-gold-500',
        gradient: 'from-gold-500 to-gold-600'
      }
    case 'purple':
      return {
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        border: 'border-purple-500',
        gradient: 'from-purple-500 to-purple-600'
      }
    default:
      return {
        bg: 'bg-dark-600',
        text: 'text-dark-400',
        border: 'border-dark-500',
        gradient: 'from-dark-500 to-dark-600'
      }
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { completeTutorial, setHasCompletedTutorial } = useTutorialStore()
  const sounds = useSounds()

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)

  const step = TUTORIAL_STEPS[currentStep]
  const colors = getColorClasses(step.color)
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1
  const isFirstStep = currentStep === 0

  function handleNext() {
    if (isLastStep) {
      handleComplete()
    } else {
      sounds.play('button_click')
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    }
  }

  function handlePrev() {
    if (!isFirstStep) {
      sounds.play('button_click')
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  function handleComplete() {
    sounds.play('notification')
    completeTutorial()
    router.push('/dashboard')
  }

  function handleSkip() {
    sounds.play('button_click')
    setHasCompletedTutorial(true)
    router.push('/dashboard')
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-fire-900/10 via-dark-950 to-purple-900/10" />

      {/* Skip button */}
      <div className="relative z-10 p-4 flex justify-end">
        <button
          onClick={handleSkip}
          className="text-dark-400 hover:text-white text-sm"
        >
          Skip tutorial
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div className="w-full max-w-lg">
          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {TUTORIAL_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentStep ? 1 : -1)
                  setCurrentStep(index)
                }}
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-300",
                  index === currentStep
                    ? `bg-gradient-to-r ${colors.gradient} scale-125`
                    : index < currentStep
                    ? "bg-dark-500"
                    : "bg-dark-700"
                )}
              />
            ))}
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="card text-center"
            >
              {/* Icon */}
              <div className={cn(
                "w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center",
                colors.bg, colors.text
              )}>
                {step.icon}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold mb-2">{step.title}</h1>
              <p className="text-dark-400 mb-8">{step.description}</p>

              {/* Details */}
              <div className="space-y-3 mb-6 text-left">
                {step.details.map((detail, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <ChevronRight className={cn("w-5 h-5 mt-0.5 shrink-0", colors.text)} />
                    <span className="text-dark-300">{detail}</span>
                  </motion.div>
                ))}
              </div>

              {/* Tip */}
              {step.tip && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={cn(
                    "p-4 rounded-xl border text-sm text-left",
                    colors.bg, colors.border, "border-opacity-30"
                  )}
                >
                  <span className={cn("font-semibold", colors.text)}>Pro Tip: </span>
                  <span className="text-dark-300">{step.tip}</span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={cn(
                "flex-1 btn-dark flex items-center justify-center gap-2",
                isFirstStep && "opacity-50 cursor-not-allowed"
              )}
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={handleNext}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95",
                `bg-gradient-to-r ${colors.gradient} text-white`
              )}
            >
              {isLastStep ? "Let's Go!" : "Next"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Step counter */}
          <p className="text-center text-dark-500 mt-4 text-sm">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </p>
        </div>
      </div>
    </div>
  )
}
