'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, UserPlus, Swords, Trophy, Award, X, Check, ChevronRight
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Notification, NotificationType,
  getNotifications, getUnreadNotificationCount,
  markNotificationRead, markAllNotificationsRead
} from '@/lib/supabase'
import { cn } from '@/lib/utils'

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return <UserPlus className="w-4 h-4" />
    case 'battle_invite':
    case 'battle_result':
      return <Swords className="w-4 h-4" />
    case 'tournament_starting':
      return <Trophy className="w-4 h-4" />
    case 'achievement_unlocked':
      return <Award className="w-4 h-4" />
    default:
      return <Bell className="w-4 h-4" />
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

// Demo notifications for demo mode
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
    message: 'LyricQueen challenged you!',
    data: { battleId: 'b1', fromUsername: 'LyricQueen' },
    read: false,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
]

export default function NotificationBell() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadUnreadCount()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadUnreadCount() {
    if (!user) return
    if (isDemo) {
      setUnreadCount(DEMO_NOTIFICATIONS.filter(n => !n.read).length)
      return
    }
    const count = await getUnreadNotificationCount(user.id)
    setUnreadCount(count)
  }

  async function loadNotifications() {
    if (!user) return
    setLoading(true)
    if (isDemo) {
      setNotifications(DEMO_NOTIFICATIONS)
    } else {
      const data = await getNotifications(user.id, 5)
      setNotifications(data.length > 0 ? data : [])
    }
    setLoading(false)
  }

  function toggleDropdown() {
    if (!isOpen) {
      loadNotifications()
    }
    setIsOpen(!isOpen)
  }

  async function handleMarkAllRead() {
    if (!user) return
    if (isDemo) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      return
    }
    await markAllNotificationsRead(user.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      if (isDemo) {
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        await markNotificationRead(notification.id)
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    }

    setIsOpen(false)

    // Navigate based on type
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
        router.push('/history')
        break
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-lg hover:bg-dark-800 transition-colors"
      >
        <Bell className="w-6 h-6 text-dark-400 hover:text-white" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-fire-500 rounded-full text-xs font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="font-bold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-gold-400 hover:text-gold-300"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-dark-700 rounded"
                >
                  <X className="w-4 h-4 text-dark-400" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-dark-700">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "w-full flex items-start gap-3 p-4 text-left hover:bg-dark-700/50 transition-colors",
                        !notification.read && "bg-dark-700/30"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        getNotificationColor(notification.type)
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          !notification.read && "text-white"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-dark-400 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-dark-500 mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-gold-500 rounded-full shrink-0 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-dark-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-dark-700 p-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/notifications')
                }}
                className="w-full py-2 text-sm text-gold-400 hover:text-gold-300 hover:bg-dark-700/50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                View all notifications
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
