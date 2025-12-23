/**
 * Unit tests for Zustand stores
 * Run with: npx jest __tests__/store.test.ts
 */

import { act } from '@testing-library/react'
import { useUserStore, useBattleStore, useTutorialStore, DEMO_USER } from '../lib/store'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useUserStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { setUser, setLoading, setDemo } = useUserStore.getState()
    setUser(null)
    setLoading(true)
    setDemo(false)
  })

  it('should have correct initial state', () => {
    const state = useUserStore.getState()
    expect(state.user).toBeNull()
    expect(state.isLoading).toBe(true)
    expect(state.isDemo).toBe(false)
  })

  it('should set user and stop loading', () => {
    const { setUser } = useUserStore.getState()

    act(() => {
      setUser(DEMO_USER)
    })

    const state = useUserStore.getState()
    expect(state.user).toEqual(DEMO_USER)
    expect(state.isLoading).toBe(false)
  })

  it('should set demo mode', () => {
    const { setDemo } = useUserStore.getState()

    act(() => {
      setDemo(true)
    })

    expect(useUserStore.getState().isDemo).toBe(true)
  })

  it('should clear user and demo on logout', () => {
    const { setUser, setDemo, logout } = useUserStore.getState()

    act(() => {
      setUser(DEMO_USER)
      setDemo(true)
    })

    expect(useUserStore.getState().user).toEqual(DEMO_USER)
    expect(useUserStore.getState().isDemo).toBe(true)

    act(() => {
      logout()
    })

    const state = useUserStore.getState()
    expect(state.user).toBeNull()
    expect(state.isDemo).toBe(false)
  })
})

describe('useBattleStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { resetBattle } = useBattleStore.getState()
    act(() => {
      resetBattle()
    })
  })

  it('should have correct initial state', () => {
    const state = useBattleStore.getState()
    expect(state.currentBattle).toBeNull()
    expect(state.selectedBeat).toBeNull()
    expect(state.isMatchmaking).toBe(false)
    expect(state.matchmakingTime).toBe(0)
    expect(state.battlePhase).toBe('idle')
    expect(state.currentRound).toBe(1)
    expect(state.isRecording).toBe(false)
    expect(state.recordingTime).toBe(0)
  })

  it('should set matchmaking state', () => {
    const { setMatchmaking, setMatchmakingTime } = useBattleStore.getState()

    act(() => {
      setMatchmaking(true)
      setMatchmakingTime(30)
    })

    const state = useBattleStore.getState()
    expect(state.isMatchmaking).toBe(true)
    expect(state.matchmakingTime).toBe(30)
  })

  it('should update battle phase', () => {
    const { setBattlePhase } = useBattleStore.getState()

    const phases: Array<'idle' | 'matchmaking' | 'countdown' | 'player1_turn' | 'player2_turn' | 'judging' | 'results'> = [
      'matchmaking',
      'countdown',
      'player1_turn',
      'player2_turn',
      'judging',
      'results'
    ]

    phases.forEach(phase => {
      act(() => {
        setBattlePhase(phase)
      })
      expect(useBattleStore.getState().battlePhase).toBe(phase)
    })
  })

  it('should track current round', () => {
    const { setCurrentRound } = useBattleStore.getState()

    act(() => {
      setCurrentRound(1)
    })
    expect(useBattleStore.getState().currentRound).toBe(1)

    act(() => {
      setCurrentRound(2)
    })
    expect(useBattleStore.getState().currentRound).toBe(2)

    act(() => {
      setCurrentRound(3)
    })
    expect(useBattleStore.getState().currentRound).toBe(3)
  })

  it('should track recording state', () => {
    const { setRecording, setRecordingTime } = useBattleStore.getState()

    act(() => {
      setRecording(true)
      setRecordingTime(45)
    })

    const state = useBattleStore.getState()
    expect(state.isRecording).toBe(true)
    expect(state.recordingTime).toBe(45)
  })

  it('should reset all battle state', () => {
    const store = useBattleStore.getState()

    // Set various state
    act(() => {
      store.setMatchmaking(true)
      store.setMatchmakingTime(60)
      store.setBattlePhase('player1_turn')
      store.setCurrentRound(2)
      store.setRecording(true)
      store.setRecordingTime(30)
    })

    // Reset
    act(() => {
      store.resetBattle()
    })

    const state = useBattleStore.getState()
    expect(state.currentBattle).toBeNull()
    expect(state.selectedBeat).toBeNull()
    expect(state.isMatchmaking).toBe(false)
    expect(state.matchmakingTime).toBe(0)
    expect(state.battlePhase).toBe('idle')
    expect(state.currentRound).toBe(1)
    expect(state.isRecording).toBe(false)
    expect(state.recordingTime).toBe(0)
  })
})

describe('useTutorialStore', () => {
  beforeEach(() => {
    // Reset store and localStorage mocks
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()

    const { resetTutorial } = useTutorialStore.getState()
    act(() => {
      resetTutorial()
    })
  })

  it('should have correct initial state', () => {
    const state = useTutorialStore.getState()
    expect(state.hasCompletedTutorial).toBe(false)
    expect(state.currentStep).toBe(0)
    expect(state.tutorialActive).toBe(false)
  })

  it('should navigate steps forward', () => {
    const { setTutorialActive, nextStep } = useTutorialStore.getState()

    act(() => {
      setTutorialActive(true)
    })

    expect(useTutorialStore.getState().currentStep).toBe(0)

    act(() => {
      nextStep()
    })
    expect(useTutorialStore.getState().currentStep).toBe(1)

    act(() => {
      nextStep()
    })
    expect(useTutorialStore.getState().currentStep).toBe(2)
  })

  it('should navigate steps backward', () => {
    const { setCurrentStep, prevStep } = useTutorialStore.getState()

    act(() => {
      setCurrentStep(5)
    })

    act(() => {
      prevStep()
    })
    expect(useTutorialStore.getState().currentStep).toBe(4)

    act(() => {
      prevStep()
    })
    expect(useTutorialStore.getState().currentStep).toBe(3)
  })

  it('should not go below step 0', () => {
    const { setCurrentStep, prevStep } = useTutorialStore.getState()

    act(() => {
      setCurrentStep(0)
    })

    act(() => {
      prevStep()
    })
    expect(useTutorialStore.getState().currentStep).toBe(0)
  })

  it('should complete tutorial and save to localStorage', () => {
    const { setTutorialActive, completeTutorial } = useTutorialStore.getState()

    act(() => {
      setTutorialActive(true)
    })

    act(() => {
      completeTutorial()
    })

    const state = useTutorialStore.getState()
    expect(state.hasCompletedTutorial).toBe(true)
    expect(state.tutorialActive).toBe(false)
    expect(state.currentStep).toBe(0)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('tutorial_completed', 'true')
  })

  it('should reset tutorial and clear localStorage', () => {
    const { completeTutorial, resetTutorial } = useTutorialStore.getState()

    act(() => {
      completeTutorial()
    })

    act(() => {
      resetTutorial()
    })

    const state = useTutorialStore.getState()
    expect(state.hasCompletedTutorial).toBe(false)
    expect(state.currentStep).toBe(0)
    expect(state.tutorialActive).toBe(false)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('tutorial_completed')
  })
})

describe('DEMO_USER constant', () => {
  it('should have all required fields', () => {
    expect(DEMO_USER).toHaveProperty('id')
    expect(DEMO_USER).toHaveProperty('username')
    expect(DEMO_USER).toHaveProperty('avatar_url')
    expect(DEMO_USER).toHaveProperty('elo_rating')
    expect(DEMO_USER).toHaveProperty('wins')
    expect(DEMO_USER).toHaveProperty('losses')
    expect(DEMO_USER).toHaveProperty('total_battles')
    expect(DEMO_USER).toHaveProperty('created_at')
    expect(DEMO_USER).toHaveProperty('updated_at')
  })

  it('should have valid demo values', () => {
    expect(DEMO_USER.id).toBe('demo-user-123')
    expect(DEMO_USER.username).toBe('DemoRapper')
    expect(DEMO_USER.elo_rating).toBe(1000)
    expect(DEMO_USER.wins).toBe(5)
    expect(DEMO_USER.losses).toBe(3)
    expect(DEMO_USER.total_battles).toBe(8)
  })

  it('should have consistent battle stats', () => {
    expect(DEMO_USER.wins + DEMO_USER.losses).toBe(DEMO_USER.total_battles)
  })
})
