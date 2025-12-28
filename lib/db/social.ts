import { supabase, Profile } from './client'

// Friends/Following system
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
  user?: Profile
  friend?: Profile
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending'
    })

  if (error) {
    console.error('Error sending friend request:', error)
    return false
  }
  return true
}

export async function acceptFriendRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)

  if (error) {
    console.error('Error accepting friend request:', error)
    return false
  }
  return true
}

export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)

  if (error) {
    console.error('Error removing friend:', error)
    return false
  }
  return true
}

export async function getFriends(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      user:profiles!friendships_user_id_fkey(id, username, avatar_url, elo_rating, wins, losses, total_battles),
      friend:profiles!friendships_friend_id_fkey(id, username, avatar_url, elo_rating, wins, losses, total_battles)
    `)
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

  if (error) {
    console.error('Error fetching friends:', error)
    return []
  }

  return (data || []).map(f => f.user_id === userId ? f.friend : f.user).filter(Boolean) as Profile[]
}

export async function getPendingFriendRequests(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      user:profiles!friendships_user_id_fkey(id, username, avatar_url, elo_rating)
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error fetching pending requests:', error)
    return []
  }
  return data || []
}

export async function getFriendshipStatus(userId: string, otherUserId: string): Promise<Friendship | null> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`)
    .single()

  if (error) {
    return null
  }
  return data
}

// Achievements system
export type AchievementType =
  | 'first_win'
  | 'first_battle'
  | 'win_streak_5'
  | 'win_streak_10'
  | 'battles_10'
  | 'battles_50'
  | 'battles_100'
  | 'tournament_win'
  | 'tournament_finals'
  | 'elo_1200'
  | 'elo_1500'
  | 'elo_1800'
  | 'elo_2000'
  | 'spectator_favorite'
  | 'social_butterfly'

export interface Achievement {
  id: string
  user_id: string
  achievement_type: AchievementType
  unlocked_at: string
}

export const ACHIEVEMENT_INFO: Record<AchievementType, { name: string; description: string; icon: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }> = {
  first_battle: { name: 'First Steps', description: 'Complete your first battle', icon: '🎤', rarity: 'common' },
  first_win: { name: 'Victory Lap', description: 'Win your first battle', icon: '🏆', rarity: 'common' },
  win_streak_5: { name: 'On Fire', description: 'Win 5 battles in a row', icon: '🔥', rarity: 'rare' },
  win_streak_10: { name: 'Unstoppable', description: 'Win 10 battles in a row', icon: '⚡', rarity: 'epic' },
  battles_10: { name: 'Regular', description: 'Complete 10 battles', icon: '🎯', rarity: 'common' },
  battles_50: { name: 'Veteran', description: 'Complete 50 battles', icon: '⭐', rarity: 'rare' },
  battles_100: { name: 'Legend', description: 'Complete 100 battles', icon: '👑', rarity: 'epic' },
  tournament_win: { name: 'Champion', description: 'Win a tournament', icon: '🏅', rarity: 'legendary' },
  tournament_finals: { name: 'Finalist', description: 'Reach a tournament final', icon: '🥈', rarity: 'epic' },
  elo_1200: { name: 'Gold Status', description: 'Reach 1200 ELO', icon: '🥇', rarity: 'common' },
  elo_1500: { name: 'Diamond Status', description: 'Reach 1500 ELO', icon: '💎', rarity: 'rare' },
  elo_1800: { name: 'Master Status', description: 'Reach 1800 ELO', icon: '🔮', rarity: 'epic' },
  elo_2000: { name: 'Legendary Status', description: 'Reach 2000 ELO', icon: '👑', rarity: 'legendary' },
  spectator_favorite: { name: 'Fan Favorite', description: 'Get 100 total spectator votes', icon: '❤️', rarity: 'rare' },
  social_butterfly: { name: 'Social Butterfly', description: 'Add 10 friends', icon: '🦋', rarity: 'rare' },
}

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.error('Error fetching achievements:', error)
    return []
  }
  return data || []
}

export async function unlockAchievement(userId: string, achievementType: AchievementType): Promise<boolean> {
  const { count } = await supabase
    .from('achievements')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('achievement_type', achievementType)

  if (count && count > 0) return false

  const { error } = await supabase
    .from('achievements')
    .insert({
      user_id: userId,
      achievement_type: achievementType
    })

  if (error) {
    console.error('Error unlocking achievement:', error)
    return false
  }
  return true
}

// Notifications system
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'battle_invite'
  | 'tournament_starting'
  | 'achievement_unlocked'
  | 'battle_result'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

export async function getNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
  return data || []
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }
  return count || 0
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification read:', error)
    return false
  }
  return true
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    console.error('Error marking all notifications read:', error)
    return false
  }
  return true
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      data: data || null
    })

  if (error) {
    console.error('Error creating notification:', error)
    return false
  }
  return true
}

// User settings
export interface UserSettings {
  id: string
  user_id: string
  sound_enabled: boolean
  sound_volume: number
  notifications_enabled: boolean
  notifications_friend_requests: boolean
  notifications_battle_invites: boolean
  notifications_tournament_updates: boolean
  privacy_show_online_status: boolean
  privacy_allow_friend_requests: boolean
  privacy_show_battle_history: boolean
  updated_at: string
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      const defaults = await createDefaultSettings(userId)
      return defaults
    }
    console.error('Error fetching user settings:', error)
    return null
  }
  return data
}

export async function createDefaultSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .insert({
      user_id: userId,
      sound_enabled: true,
      sound_volume: 0.7,
      notifications_enabled: true,
      notifications_friend_requests: true,
      notifications_battle_invites: true,
      notifications_tournament_updates: true,
      privacy_show_online_status: true,
      privacy_allow_friend_requests: true,
      privacy_show_battle_history: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating default settings:', error)
    return null
  }
  return data
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating user settings:', error)
    return false
  }
  return true
}
