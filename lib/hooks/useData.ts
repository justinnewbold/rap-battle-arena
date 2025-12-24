'use client'

import useSWR, { SWRConfiguration, mutate as globalMutate } from 'swr'
import useSWRInfinite from 'swr/infinite'
import { useCallback } from 'react'
import {
  getLeaderboard,
  getBattle,
  getBeats,
  getUserBeats,
  getProfile,
  getBattleHistory,
  Profile,
  Battle,
  Beat,
  UserBeat,
  PaginatedLeaderboard,
  LeaderboardTimeframe,
} from '@/lib/supabase'

// Default SWR configuration
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 3,
}

// Fetcher functions
const fetchers = {
  profile: (id: string) => getProfile(id),
  battle: (id: string) => getBattle(id),
  beats: () => getBeats(),
  userBeats: (userId: string) => getUserBeats(userId),
  leaderboard: (limit: number, timeframe: LeaderboardTimeframe, page: number) =>
    getLeaderboard(limit, timeframe, page),
}

// Hook for fetching user profile with caching
export function useProfile(userId: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    userId ? ['profile', userId] : null,
    ([, id]) => fetchers.profile(id),
    { ...defaultConfig, ...config }
  )

  return {
    profile: data,
    isLoading,
    isValidating,
    error,
    mutate,
  }
}

// Hook for fetching battle with caching
export function useBattle(battleId: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    battleId ? ['battle', battleId] : null,
    ([, id]) => fetchers.battle(id),
    {
      ...defaultConfig,
      refreshInterval: 5000, // Poll for updates during active battles
      ...config,
    }
  )

  return {
    battle: data,
    isLoading,
    isValidating,
    error,
    mutate,
  }
}

// Hook for fetching beats library with caching
export function useBeats(config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR(
    'beats',
    fetchers.beats,
    {
      ...defaultConfig,
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
      ...config,
    }
  )

  return {
    beats: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Hook for fetching user's beats with caching
export function useUserBeats(userId: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? ['userBeats', userId] : null,
    ([, id]) => fetchers.userBeats(id),
    { ...defaultConfig, ...config }
  )

  return {
    userBeats: data || [],
    isLoading,
    error,
    mutate,
  }
}

// Hook for fetching leaderboard with pagination and caching
export function useLeaderboard(
  timeframe: LeaderboardTimeframe = 'all',
  pageSize: number = 25,
  config?: SWRConfiguration
) {
  const getKey = (pageIndex: number) => {
    return ['leaderboard', timeframe, pageSize, pageIndex + 1]
  }

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    getKey,
    ([, tf, limit, page]) => fetchers.leaderboard(limit as number, tf as LeaderboardTimeframe, page as number),
    {
      ...defaultConfig,
      revalidateFirstPage: false,
      ...config,
    }
  )

  const players = data ? data.flatMap(page => page.data) : []
  const total = data?.[0]?.total || 0
  const hasMore = data ? data[data.length - 1]?.hasMore : false
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setSize(size + 1)
    }
  }, [hasMore, isLoadingMore, setSize, size])

  return {
    players,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    isValidating,
    error,
    loadMore,
    mutate,
  }
}

// Hook for fetching battle history with infinite scroll
export function useBattleHistory(userId: string | null, pageSize: number = 10) {
  const getKey = (pageIndex: number) => {
    if (!userId) return null
    return ['battleHistory', userId, pageSize, pageIndex]
  }

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    async ([, id, limit, page]) => {
      return getBattleHistory(id as string, limit as number, page as number)
    },
    {
      ...defaultConfig,
      revalidateFirstPage: false,
    }
  )

  const battles = data ? data.flat() : []
  const hasMore = data ? data[data.length - 1]?.length === pageSize : false
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined')

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setSize(size + 1)
    }
  }, [hasMore, isLoadingMore, setSize, size])

  return {
    battles,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  }
}

// Utility to invalidate specific caches
export function invalidateCache(key: string | string[]) {
  globalMutate(
    (cacheKey) => {
      if (Array.isArray(key)) {
        return Array.isArray(cacheKey) && key.every((k, i) => cacheKey[i] === k)
      }
      return cacheKey === key || (Array.isArray(cacheKey) && cacheKey[0] === key)
    },
    undefined,
    { revalidate: true }
  )
}

// Prefetch data for faster navigation
export function prefetchProfile(userId: string) {
  globalMutate(['profile', userId], fetchers.profile(userId))
}

export function prefetchBattle(battleId: string) {
  globalMutate(['battle', battleId], fetchers.battle(battleId))
}

export function prefetchBeats() {
  globalMutate('beats', fetchers.beats())
}
