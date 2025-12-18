import { create } from 'zustand'
import { Profile, Battle } from '../../shared/types'

interface UserState {
  user: Profile | null
  isDemo: boolean
  setUser: (user: Profile | null) => void
  setIsDemo: (isDemo: boolean) => void
  logout: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isDemo: false,
  setUser: (user) => set({ user }),
  setIsDemo: (isDemo) => set({ isDemo }),
  logout: () => set({ user: null, isDemo: false }),
}))

interface BattleState {
  currentBattle: Battle | null
  isSearching: boolean
  setCurrentBattle: (battle: Battle | null) => void
  setIsSearching: (isSearching: boolean) => void
  resetBattle: () => void
}

export const useBattleStore = create<BattleState>((set) => ({
  currentBattle: null,
  isSearching: false,
  setCurrentBattle: (battle) => set({ currentBattle: battle }),
  setIsSearching: (isSearching) => set({ isSearching }),
  resetBattle: () => set({ currentBattle: null, isSearching: false }),
}))

interface AudioState {
  isMuted: boolean
  volume: number
  isPlaying: boolean
  currentBeatId: string | null
  setMuted: (muted: boolean) => void
  setVolume: (volume: number) => void
  setPlaying: (playing: boolean, beatId?: string) => void
}

export const useAudioStore = create<AudioState>((set) => ({
  isMuted: false,
  volume: 0.7,
  isPlaying: false,
  currentBeatId: null,
  setMuted: (muted) => set({ isMuted: muted }),
  setVolume: (volume) => set({ volume }),
  setPlaying: (playing, beatId) =>
    set({ isPlaying: playing, currentBeatId: playing ? beatId || null : null }),
}))
