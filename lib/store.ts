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
