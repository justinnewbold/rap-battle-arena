'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, ArrowLeft, Check, Trash2, UserPlus, Swords,
  Trophy, Award, MessageCircle, ChevronRight, Filter, X
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Notification, NotificationType,
  getNotifications, markNotificationRead, markAllNotificationsRead,
  supabase
} from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'

type FilterType = 'all' | 'unread' | NotificationType

// Demo notifications
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    user_id: 'demo',
    type: 'friend_request',
    title: 'New Friend Request',
    message: 'MC_Thunder wants to be your friend',
    data: { fromUserId: 'u1', fromUsername: 'MC_Thunder' },
    read: false,
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: '2',
    user_id: 'demo',
    type: 'battle_invite',
    title: 'Battle Invite',
    message: 'LyricQueen challenged you to a battle!',
    data: { battleId: 'b1', fromUsername: 'LyricQueen' },
    read: false,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '3',
    user_id: 'demo',
    type: 'achievement_unlocked',
    title: 'Achievement Unlocked!',
    message: 'You earned "On Fire" - Win 5 battles in a row',
    data: { achievementType: 'win_streak_5' },
    read: true,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '4',
    user_id: 'demo',
    type: 'tournament_starting',
    title: 'Tournament Starting Soon',
    message: 'Weekly Freestyle Championship begins in 1 hour',
    data: { tournamentId: 't1' },
    read: true,
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: '5',
    user_id: 'demo',
    type: 'battle_result',
    title: 'Battle Complete',
    message: 'You won against FlowKing! +25 ELO',
    data: { battleId: 'b2', won: true, eloChange: 25 },
    read: true,
    created_at: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: '6',
    user_id: 'demo',
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    message: 'FlowMaster is now your friend!',
    data: { friendId: 'u2', friendUsername: 'FlowMaster' },
    read: true,
    created_at: new Date(Date.now() - 345600000).toISOString()
  },
]

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return <UserPlus className="w-5 h-5" />
    case 'battle_invite':
    case 'battle_result':
      return <Swords className="w-5 h-5" />
    case 'tournament_starting':
      return <Trophy className="w-5 h-5" />
    case 'achievement_unlocked':
      return <Award className="w-5 h-5" />
    default:
      return <Bell className="w-5 h-5" />
  }
}

function getNotificationColor(type: NotificationType) {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return 'bg-purple-500/20 text-purple-400'
    case 'battle_invite':
    case 'battle_result':
      return 'bg-fire-500/20 text-fire-400'
    case 'tournament_starting':
      return 'bg-gold-500/20 text-gold-400'
    case 'achievement_unlocked':
      return 'bg-green-500/20 text-green-400'
    default:
      return 'bg-dark-600 text-dark-400'
  }
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const sounds = useSounds()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadNotifications()
  }, [user, router])

  async function loadNotifications() {
    setLoading(true)
    if (isDemo) {
      setNotifications(DEMO_NOTIFICATIONS)
    } else {
      const data = await getNotifications(user!.id, 50)
      setNotifications(data.length > 0 ? data : DEMO_NOTIFICATIONS)
    }
    setLoading(false)
  }

  async function handleMarkRead(notificationId: string) {
    if (isDemo) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      return
    }
    await markNotificationRead(notificationId)
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  async function handleMarkAllRead() {
    sounds.play('notification')
    if (isDemo) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      return
    }
    await markAllNotificationsRead(user!.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function handleDelete(notificationId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (isDemo) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      return
    }
    await supabase.from('notifications').delete().eq('id', notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  async function handleClearAll() {
    if (isDemo) {
      setNotifications([])
      return
    }
    await supabase.from('notifications').delete().eq('user_id', user!.id)
    setNotifications([])
  }

  function handleNotificationClick(notification: Notification) {
    handleMarkRead(notification.id)

    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
      case 'friend_accepted':
        router.push('/friends')
        break
      case 'battle_invite':
        if (notification.data?.battleId) {
          router.push(`/battle/${notification.data.battleId}`)
        }
        break
      case 'tournament_starting':
        if (notification.data?.tournamentId) {
          router.push(`/tournaments/${notification.data.tournamentId}`)
        }
        break
      case 'achievement_unlocked':
        router.push('/achievements')
        break
      case 'battle_result':
        if (notification.data?.battleId) {
          router.push(`/battle/replay/${notification.data.battleId}`)
        } else {
          router.push('/history')
        }
        break
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read
    return n.type === filter
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const filterOptions: { id: FilterType; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'friend_request', label: 'Friends', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'battle_invite', label: 'Battles', icon: <Swords className="w-4 h-4" /> },
    { id: 'tournament_starting', label: 'Tournaments', icon: <Trophy className="w-4 h-4" /> },
    { id: 'achievement_unlocked', label: 'Achievements', icon: <Award className="w-4 h-4" /> },
  ]

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-900/10 via-dark-950 to-purple-900/10" />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-dark-400 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Bell className="w-8 h-8 text-gold-400" />
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-dark-400 mt-1">{unreadCount} unread</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                filter === option.id
                  ? 'bg-gold-500 text-black'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              )}
            >
              {option.icon}
              {option.label}
              {option.id === 'unread' && unreadCount > 0 && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  filter === option.id ? 'bg-black/20' : 'bg-fire-500'
                )}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "card flex items-center gap-4 cursor-pointer transition-all hover:border-dark-600 group",
                    !notification.read && "border-l-4 border-l-gold-500"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    getNotificationColor(notification.type)
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      !notification.read && "text-white"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-dark-400 truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-dark-500 mt-1">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className="w-3 h-3 bg-gold-500 rounded-full shrink-0" />
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(notification.id, e)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight className="w-5 h-5 text-dark-500 shrink-0" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="card text-center py-12">
            <Bell className="w-16 h-16 mx-auto mb-4 text-dark-600" />
            <h3 className="text-xl font-bold mb-2">
              {filter === 'all' ? 'No Notifications' : `No ${filter === 'unread' ? 'Unread' : filter.replace('_', ' ')} Notifications`}
            </h3>
            <p className="text-dark-400">
              {filter === 'all' ? "You're all caught up!" : 'Try a different filter'}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="btn-dark mt-4"
              >
                View All Notifications
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
