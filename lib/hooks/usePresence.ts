'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserStore, usePresenceStore } from '@/lib/store'

interface PresenceState {
  id: string
  username: string
  status: 'online' | 'away' | 'in_battle'
  lastSeen: string
}

export function usePresence() {
  const { user, isDemo } = useUserStore()
  const { setOnlineUsers, addOnlineUser, removeOnlineUser, onlineUsers, isUserOnline } = usePresenceStore()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user || isDemo) return

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>()
        const onlineUserIds = Object.keys(state)
        setOnlineUsers(onlineUserIds)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key) addOnlineUser(key)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key) removeOnlineUser(key)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            username: user.username,
            status: 'online',
            lastSeen: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, isDemo, setOnlineUsers, addOnlineUser, removeOnlineUser])

  const updateStatus = async (status: 'online' | 'away' | 'in_battle') => {
    if (!user || !channelRef.current) return

    await channelRef.current.track({
      id: user.id,
      username: user.username,
      status,
      lastSeen: new Date().toISOString(),
    })
  }

  return {
    onlineUsers,
    isUserOnline,
    updateStatus,
  }
}

export function useFriendPresence(friendIds: string[]) {
  const { isUserOnline } = usePresenceStore()

  return friendIds.reduce((acc, id) => {
    acc[id] = isUserOnline(id)
    return acc
  }, {} as Record<string, boolean>)
}
