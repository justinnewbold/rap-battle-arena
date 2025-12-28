'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase, Battle, BattleRound, Vote } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface UseBattleRealtimeConfig {
  battleId: string
  enabled?: boolean
  onBattleUpdate?: (battle: Battle) => void
  onNewRound?: (round: BattleRound) => void
  onNewVote?: (vote: Vote) => void
  onSpectatorJoin?: (spectatorId: string) => void
  onSpectatorLeave?: (spectatorId: string) => void
  onNewChatMessage?: (message: { userId: string; message: string }) => void
}

interface BattleRealtimeState {
  battle: Battle | null
  rounds: BattleRound[]
  votes: Vote[]
  spectatorCount: number
  isConnected: boolean
  lastUpdated: Date | null
}

export function useBattleRealtime({
  battleId,
  enabled = true,
  onBattleUpdate,
  onNewRound,
  onNewVote,
  onSpectatorJoin,
  onSpectatorLeave,
  onNewChatMessage,
}: UseBattleRealtimeConfig) {
  const [state, setState] = useState<BattleRealtimeState>({
    battle: null,
    rounds: [],
    votes: [],
    spectatorCount: 0,
    isConnected: false,
    lastUpdated: null,
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)

  // Handle battle updates
  const handleBattleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Battle>) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        const newBattle = payload.new as Battle
        setState((prev) => ({
          ...prev,
          battle: newBattle,
          lastUpdated: new Date(),
        }))
        onBattleUpdate?.(newBattle)
      }
    },
    [onBattleUpdate]
  )

  // Handle new rounds
  const handleRoundChange = useCallback(
    (payload: RealtimePostgresChangesPayload<BattleRound>) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const newRound = payload.new as BattleRound
        setState((prev) => ({
          ...prev,
          rounds: [...prev.rounds, newRound],
          lastUpdated: new Date(),
        }))
        onNewRound?.(newRound)
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedRound = payload.new as BattleRound
        setState((prev) => ({
          ...prev,
          rounds: prev.rounds.map((r) =>
            r.id === updatedRound.id ? updatedRound : r
          ),
          lastUpdated: new Date(),
        }))
      }
    },
    [onNewRound]
  )

  // Handle new votes
  const handleVoteChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Vote>) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const newVote = payload.new as Vote
        setState((prev) => ({
          ...prev,
          votes: [...prev.votes, newVote],
          lastUpdated: new Date(),
        }))
        onNewVote?.(newVote)
      }
    },
    [onNewVote]
  )

  // Handle spectator changes
  const handleSpectatorChange = useCallback(
    (payload: RealtimePostgresChangesPayload<{ user_id: string }>) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const userId = (payload.new as { user_id: string }).user_id
        setState((prev) => ({
          ...prev,
          spectatorCount: prev.spectatorCount + 1,
        }))
        onSpectatorJoin?.(userId)
      } else if (payload.eventType === 'DELETE' && payload.old) {
        const userId = (payload.old as { user_id: string }).user_id
        setState((prev) => ({
          ...prev,
          spectatorCount: Math.max(0, prev.spectatorCount - 1),
        }))
        onSpectatorLeave?.(userId)
      }
    },
    [onSpectatorJoin, onSpectatorLeave]
  )

  // Handle chat messages
  const handleChatMessage = useCallback(
    (payload: RealtimePostgresChangesPayload<{ user_id: string; message: string }>) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const { user_id, message } = payload.new as { user_id: string; message: string }
        onNewChatMessage?.({ userId: user_id, message })
      }
    },
    [onNewChatMessage]
  )

  // Broadcast an event to all connected clients
  const broadcast = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event,
          payload,
        })
      }
    },
    []
  )

  // Connect to realtime channels
  useEffect(() => {
    if (!enabled || !battleId) return

    // Main battle channel for postgres changes
    const channel = supabase
      .channel(`battle:${battleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`,
        },
        handleBattleChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_rounds',
          filter: `battle_id=eq.${battleId}`,
        },
        handleRoundChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_votes',
          filter: `battle_id=eq.${battleId}`,
        },
        handleVoteChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_spectators',
          filter: `battle_id=eq.${battleId}`,
        },
        handleSpectatorChange
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_chat',
          filter: `battle_id=eq.${battleId}`,
        },
        handleChatMessage
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setState((prev) => ({ ...prev, isConnected: true }))
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setState((prev) => ({ ...prev, isConnected: false }))
        }
      })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current)
        presenceChannelRef.current = null
      }
      setState((prev) => ({ ...prev, isConnected: false }))
    }
  }, [
    battleId,
    enabled,
    handleBattleChange,
    handleRoundChange,
    handleVoteChange,
    handleSpectatorChange,
    handleChatMessage,
  ])

  // Initial data fetch
  useEffect(() => {
    if (!enabled || !battleId) return

    async function fetchInitialData() {
      const [battleRes, roundsRes, votesRes, spectatorsRes] = await Promise.all([
        supabase
          .from('battles')
          .select('*')
          .eq('id', battleId)
          .single(),
        supabase
          .from('battle_rounds')
          .select('*')
          .eq('battle_id', battleId)
          .order('round_number'),
        supabase
          .from('battle_votes')
          .select('*')
          .eq('battle_id', battleId),
        supabase
          .from('battle_spectators')
          .select('*', { count: 'exact', head: true })
          .eq('battle_id', battleId),
      ])

      setState((prev) => ({
        ...prev,
        battle: battleRes.data,
        rounds: roundsRes.data || [],
        votes: votesRes.data || [],
        spectatorCount: spectatorsRes.count || 0,
        lastUpdated: new Date(),
      }))
    }

    fetchInitialData()
  }, [battleId, enabled])

  return {
    ...state,
    broadcast,
    reconnect: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      // Will trigger reconnection via useEffect
    },
  }
}
