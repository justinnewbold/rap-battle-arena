'use client';

// Simple in-memory store for battle state
let battleState = {
  isRecording: false,
  currentRound: 1,
  timeRemaining: 60,
  isMuted: false,
  volume: 80,
};

const listeners = new Set<() => void>();

export const useBattleStore = () => {
  return {
    ...battleState,
    setRecording: (recording: boolean) => {
      battleState.isRecording = recording;
      listeners.forEach(l => l());
    },
    setCurrentRound: (round: number) => {
      battleState.currentRound = round;
      listeners.forEach(l => l());
    },
    setTimeRemaining: (time: number) => {
      battleState.timeRemaining = time;
      listeners.forEach(l => l());
    },
    setMuted: (muted: boolean) => {
      battleState.isMuted = muted;
      listeners.forEach(l => l());
    },
    setVolume: (volume: number) => {
      battleState.volume = volume;
      listeners.forEach(l => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export default useBattleStore;