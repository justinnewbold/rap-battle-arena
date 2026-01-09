import { create } from 'zustand'
import { Profile, Battle, Beat } from './supabase'

interface UserState {
  user: Profile | null
  isLoading: boolean
  isDemo: boolean
  setUser: (user: Profile | null) => void
  setLoading: (loading: boolean) => void
  setDemo: (demo: boolean) => void
  logout: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: true,
  isDemo: false,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setDemo: (isDemo) => set({ isDemo }),
  logout: () => set({ user: null, isDemo: false }),
}))

interface BattleState {
  currentBattle: Battle | null
  selectedBeat: Beat | null
  isMatchmaking: boolean
  matchmakingTime: number
  battlePhase: 'idle' | 'matchmaking' | 'countdown' | 'player1_turn' | 'player2_turn' | 'judging' | 'results'
  currentRound: number
  isRecording: boolean
  recordingTime: number
  
  setCurrentBattle: (battle: Battle | null) => void
  setSelectedBeat: (beat: Beat | null) => void
  setMatchmaking: (isMatchmaking: boolean) => void
  setMatchmakingTime: (time: number) => void
  setBattlePhase: (phase: BattleState['battlePhase']) => void
  setCurrentRound: (round: number) => void
  setRecording: (isRecording: boolean) => void
  setRecordingTime: (time: number) => void
  resetBattle: () => void
}

export const useBattleStore = create<BattleState>((set) => ({
  currentBattle: null,
  selectedBeat: null,
  isMatchmaking: false,
  matchmakingTime: 0,
  battlePhase: 'idle',
  currentRound: 1,
  isRecording: false,
  recordingTime: 0,
  
  setCurrentBattle: (currentBattle) => set({ currentBattle }),
  setSelectedBeat: (selectedBeat) => set({ selectedBeat }),
  setMatchmaking: (isMatchmaking) => set({ isMatchmaking }),
  setMatchmakingTime: (matchmakingTime) => set({ matchmakingTime }),
  setBattlePhase: (battlePhase) => set({ battlePhase }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setRecording: (isRecording) => set({ isRecording }),
  setRecordingTime: (recordingTime) => set({ recordingTime }),
  resetBattle: () => set({
    currentBattle: null,
    selectedBeat: null,
    isMatchmaking: false,
    matchmakingTime: 0,
    battlePhase: 'idle',
    currentRound: 1,
    isRecording: false,
    recordingTime: 0,
  }),
}))

// Tutorial state
interface TutorialState {
  hasCompletedTutorial: boolean
  currentStep: number
  tutorialActive: boolean
  setHasCompletedTutorial: (completed: boolean) => void
  setCurrentStep: (step: number) => void
  setTutorialActive: (active: boolean) => void
  nextStep: () => void
  prevStep: () => void
  completeTutorial: () => void
  resetTutorial: () => void
}

export const useTutorialStore = create<TutorialState>((set) => ({
  hasCompletedTutorial: typeof window !== 'undefined'
    ? localStorage.getItem('tutorial_completed') === 'true'
    : false,
  currentStep: 0,
  tutorialActive: false,
  setHasCompletedTutorial: (hasCompletedTutorial) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tutorial_completed', String(hasCompletedTutorial))
    }
    set({ hasCompletedTutorial })
  },
  setCurrentStep: (currentStep) => set({ currentStep }),
  setTutorialActive: (tutorialActive) => set({ tutorialActive }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
  completeTutorial: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tutorial_completed', 'true')
    }
    set({ hasCompletedTutorial: true, tutorialActive: false, currentStep: 0 })
  },
  resetTutorial: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tutorial_completed')
    }
    set({ hasCompletedTutorial: false, currentStep: 0, tutorialActive: false })
  },
}))

// Demo user for testing without auth
export const DEMO_USER: Profile = {
  id: 'demo-user-123',
  username: 'DemoRapper',
  avatar_url: null,
  elo_rating: 1000,
  wins: 5,
  losses: 3,
  total_battles: 8,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// Online presence tracking
interface PresenceState {
  onlineUsers: Set<string>
  setOnlineUsers: (users: string[]) => void
  addOnlineUser: (userId: string) => void
  removeOnlineUser: (userId: string) => void
  isUserOnline: (userId: string) => boolean
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: new Set<string>(),
  setOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),
  addOnlineUser: (userId) => set((state) => {
    const newSet = new Set(state.onlineUsers)
    newSet.add(userId)
    return { onlineUsers: newSet }
  }),
  removeOnlineUser: (userId) => set((state) => {
    const newSet = new Set(state.onlineUsers)
    newSet.delete(userId)
    return { onlineUsers: newSet }
  }),
  isUserOnline: (userId) => get().onlineUsers.has(userId),
}))
