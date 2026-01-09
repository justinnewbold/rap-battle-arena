'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, UserMinus, Search, ArrowLeft,
  Swords, Check, X, Clock, MessageCircle, Send, Loader2
} from 'lucide-react'
import { useUserStore, usePresenceStore } from '@/lib/store'
import {
  Profile, Friendship,
  getFriends, getPendingFriendRequests, getOutgoingFriendRequests,
  acceptFriendRequest, rejectFriendRequest, removeFriend,
  sendFriendRequest, searchUsers, getFriendshipStatus
} from '@/lib/supabase'
import { getAvatarUrl, formatElo, getEloRank, cn } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'
import { usePresence, useFriendPresence } from '@/lib/hooks/usePresence'

// Demo friends data
const DEMO_FRIENDS: Profile[] = [
  { id: 'f1', username: 'MC_Thunder', avatar_url: null, elo_rating: 1450, wins: 28, losses: 12, total_battles: 40, created_at: '', updated_at: '' },
  { id: 'f2', username: 'LyricQueen', avatar_url: null, elo_rating: 1380, wins: 22, losses: 15, total_battles: 37, created_at: '', updated_at: '' },
  { id: 'f3', username: 'BeatMaster', avatar_url: null, elo_rating: 1520, wins: 35, losses: 10, total_battles: 45, created_at: '', updated_at: '' },
  { id: 'f4', username: 'FlowKing', avatar_url: null, elo_rating: 1290, wins: 18, losses: 14, total_battles: 32, created_at: '', updated_at: '' },
]

const DEMO_PENDING: Friendship[] = [
  { id: 'p1', user_id: 'u1', friend_id: 'me', status: 'pending', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: '', user: { id: 'u1', username: 'NewRapper', avatar_url: null, elo_rating: 1050, wins: 5, losses: 3, total_battles: 8, created_at: '', updated_at: '' } },
  { id: 'p2', user_id: 'u2', friend_id: 'me', status: 'pending', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: '', user: { id: 'u2', username: 'VerseMaker', avatar_url: null, elo_rating: 1180, wins: 12, losses: 8, total_battles: 20, created_at: '', updated_at: '' } },
]

const DEMO_SEARCH_RESULTS: Profile[] = [
  { id: 's1', username: 'RhymeKing', avatar_url: null, elo_rating: 1320, wins: 25, losses: 18, total_battles: 43, created_at: '', updated_at: '' },
  { id: 's2', username: 'BarSpitter', avatar_url: null, elo_rating: 1410, wins: 30, losses: 15, total_battles: 45, created_at: '', updated_at: '' },
  { id: 's3', username: 'WordSmith', avatar_url: null, elo_rating: 1250, wins: 20, losses: 12, total_battles: 32, created_at: '', updated_at: '' },
]

// Demo online users (random selection)
const DEMO_ONLINE_USERS = new Set(['f1', 'f3', 's2'])

type Tab = 'friends' | 'pending' | 'outgoing' | 'search'

interface SearchResultWithStatus extends Profile {
  friendshipStatus?: 'none' | 'pending_incoming' | 'pending_outgoing' | 'friends'
  friendshipId?: string
}

function OnlineIndicator({ isOnline, size = 'md' }: { isOnline: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  return (
    <span
      className={cn(
        'rounded-full border-2 border-dark-800 absolute bottom-0 right-0',
        sizeClasses[size],
        isOnline ? 'bg-green-500' : 'bg-dark-500'
      )}
      title={isOnline ? 'Online' : 'Offline'}
    />
  )
}

export default function FriendsPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const { isUserOnline } = usePresenceStore()
  const sounds = useSounds()

  // Initialize presence tracking
  usePresence()

  const [activeTab, setActiveTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Profile[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultWithStatus[]>([])
  const [searching, setSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const friendPresence = useFriendPresence(friends.map(f => f.id))

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadData()
  }, [user, router])

  async function loadData() {
    setLoading(true)
    if (isDemo) {
      setFriends(DEMO_FRIENDS)
      setPendingRequests(DEMO_PENDING)
      setOutgoingRequests([])
    } else {
      const [friendsData, pendingData, outgoingData] = await Promise.all([
        getFriends(user!.id),
        getPendingFriendRequests(user!.id),
        getOutgoingFriendRequests(user!.id)
      ])
      setFriends(friendsData)
      setPendingRequests(pendingData)
      setOutgoingRequests(outgoingData)
    }
    setLoading(false)
  }

  async function handleAcceptRequest(friendshipId: string) {
    setActionLoading(friendshipId)
    sounds.play('notification')
    if (isDemo) {
      setPendingRequests(prev => prev.filter(p => p.id !== friendshipId))
      setActionLoading(null)
      return
    }
    const success = await acceptFriendRequest(friendshipId)
    if (success) {
      await loadData()
    }
    setActionLoading(null)
  }

  async function handleRejectRequest(friendshipId: string) {
    setActionLoading(friendshipId)
    if (isDemo) {
      setPendingRequests(prev => prev.filter(p => p.id !== friendshipId))
      setActionLoading(null)
      return
    }
    const success = await rejectFriendRequest(friendshipId)
    if (success) {
      setPendingRequests(prev => prev.filter(p => p.id !== friendshipId))
    }
    setActionLoading(null)
  }

  async function handleCancelRequest(friendshipId: string) {
    setActionLoading(friendshipId)
    if (isDemo) {
      setOutgoingRequests(prev => prev.filter(p => p.id !== friendshipId))
      setActionLoading(null)
      return
    }
    const success = await rejectFriendRequest(friendshipId)
    if (success) {
      setOutgoingRequests(prev => prev.filter(p => p.id !== friendshipId))
    }
    setActionLoading(null)
  }

  async function handleRemoveFriend(friendId: string) {
    setActionLoading(friendId)
    if (isDemo) {
      setFriends(prev => prev.filter(f => f.id !== friendId))
      setActionLoading(null)
      return
    }
    const success = await removeFriend(user!.id, friendId)
    if (success) {
      setFriends(prev => prev.filter(f => f.id !== friendId))
    }
    setActionLoading(null)
  }

  async function handleSendFriendRequest(targetUserId: string) {
    setActionLoading(targetUserId)
    sounds.play('button_click')
    if (isDemo) {
      // In demo, just update the search result
      setSearchResults(prev => prev.map(r =>
        r.id === targetUserId ? { ...r, friendshipStatus: 'pending_outgoing' as const } : r
      ))
      setActionLoading(null)
      return
    }
    const success = await sendFriendRequest(user!.id, targetUserId)
    if (success) {
      // Update the search result to show pending
      setSearchResults(prev => prev.map(r =>
        r.id === targetUserId ? { ...r, friendshipStatus: 'pending_outgoing' as const } : r
      ))
      // Reload outgoing requests
      const outgoingData = await getOutgoingFriendRequests(user!.id)
      setOutgoingRequests(outgoingData)
    }
    setActionLoading(null)
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)

    if (isDemo) {
      // In demo mode, filter demo results
      const results = DEMO_SEARCH_RESULTS.filter(r =>
        r.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
      // Add demo friendship status
      const resultsWithStatus: SearchResultWithStatus[] = results.map(r => ({
        ...r,
        friendshipStatus: DEMO_FRIENDS.some(f => f.id === r.id) ? 'friends' : 'none'
      }))
      setSearchResults(resultsWithStatus)
      setSearching(false)
      return
    }

    // Real search
    const results = await searchUsers(searchQuery)
    // Filter out current user and check friendship status for each
    const filteredResults = results.filter(r => r.id !== user!.id)

    // Check friendship status for each result
    const resultsWithStatus: SearchResultWithStatus[] = await Promise.all(
      filteredResults.map(async (result) => {
        const status = await getFriendshipStatus(user!.id, result.id)
        let friendshipStatus: SearchResultWithStatus['friendshipStatus'] = 'none'
        let friendshipId: string | undefined

        if (status) {
          friendshipId = status.id
          if (status.status === 'accepted') {
            friendshipStatus = 'friends'
          } else if (status.status === 'pending') {
            friendshipStatus = status.user_id === user!.id ? 'pending_outgoing' : 'pending_incoming'
          }
        }

        return { ...result, friendshipStatus, friendshipId }
      })
    )

    setSearchResults(resultsWithStatus)
    setSearching(false)
  }, [searchQuery, isDemo, user])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch()
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  function handleChallenge(friendId: string) {
    sounds.play('button_click')
    router.push(`/battle/create?challenge=${friendId}`)
  }

  function handleMessage(friendId: string) {
    sounds.play('button_click')
    router.push(`/messages?user=${friendId}`)
  }

  function isFriendOnline(friendId: string): boolean {
    if (isDemo) {
      return DEMO_ONLINE_USERS.has(friendId)
    }
    return isUserOnline(friendId)
  }

  if (!user) return null

  const onlineFriendsCount = friends.filter(f => isFriendOnline(f.id)).length

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-dark-950 to-fire-900/10" />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              Friends
            </h1>
            <p className="text-dark-400 mt-1">
              {friends.length} friends
              {onlineFriendsCount > 0 && (
                <span className="text-green-400 ml-2">• {onlineFriendsCount} online</span>
              )}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('friends')}
            className={cn(
              "flex-shrink-0 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
              activeTab === 'friends'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Users className="w-4 h-4" />
            Friends
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex-shrink-0 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 relative",
              activeTab === 'pending'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Clock className="w-4 h-4" />
            Incoming
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-fire-500 rounded-full text-xs flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={cn(
              "flex-shrink-0 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
              activeTab === 'outgoing'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Send className="w-4 h-4" />
            Sent
            {outgoingRequests.length > 0 && (
              <span className="ml-1 text-dark-400">({outgoingRequests.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              "flex-shrink-0 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
              activeTab === 'search'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Search className="w-4 h-4" />
            Find
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                </div>
              ) : friends.length > 0 ? (
                // Sort by online status first
                [...friends]
                  .sort((a, b) => {
                    const aOnline = isFriendOnline(a.id)
                    const bOnline = isFriendOnline(b.id)
                    if (aOnline && !bOnline) return -1
                    if (!aOnline && bOnline) return 1
                    return 0
                  })
                  .map((friend, index) => {
                    const rank = getEloRank(friend.elo_rating)
                    const isOnline = isFriendOnline(friend.id)
                    return (
                      <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "card flex items-center gap-4",
                          isOnline && "ring-1 ring-green-500/30"
                        )}
                      >
                        <div className="relative">
                          <img
                            src={getAvatarUrl(friend.username, friend.avatar_url)}
                            alt={friend.username}
                            className="w-14 h-14 rounded-full cursor-pointer"
                            onClick={() => router.push(`/profile/${friend.id}`)}
                          />
                          <OnlineIndicator isOnline={isOnline} />
                        </div>
                        <div
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => router.push(`/profile/${friend.id}`)}
                        >
                          <p className="font-bold text-lg truncate">{friend.username}</p>
                          <p className="text-sm text-dark-400">
                            <span className={rank.color}>{rank.icon} {formatElo(friend.elo_rating)}</span>
                            {' • '}
                            {friend.wins}W - {friend.losses}L
                          </p>
                          {isOnline && (
                            <p className="text-xs text-green-400 mt-0.5">Online now</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleMessage(friend.id)}
                            className="p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                            title="Send message"
                          >
                            <MessageCircle className="w-5 h-5 text-ice-400" />
                          </button>
                          <button
                            onClick={() => handleChallenge(friend.id)}
                            className={cn(
                              "p-3 rounded-xl transition-colors",
                              isOnline
                                ? "bg-fire-500/20 hover:bg-fire-500/30"
                                : "bg-dark-700 hover:bg-dark-600"
                            )}
                            title="Challenge to battle"
                          >
                            <Swords className={cn(
                              "w-5 h-5",
                              isOnline ? "text-fire-400" : "text-dark-400"
                            )} />
                          </button>
                          <button
                            onClick={() => handleRemoveFriend(friend.id)}
                            disabled={actionLoading === friend.id}
                            className="p-3 bg-dark-700 hover:bg-red-500/20 rounded-xl transition-colors group"
                            title="Remove friend"
                          >
                            {actionLoading === friend.id ? (
                              <Loader2 className="w-5 h-5 animate-spin text-dark-400" />
                            ) : (
                              <UserMinus className="w-5 h-5 text-dark-400 group-hover:text-red-400" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })
              ) : (
                <div className="card text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                  <h3 className="text-xl font-bold mb-2">No Friends Yet</h3>
                  <p className="text-dark-400 mb-4">Search for rappers to add as friends</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="btn-purple"
                  >
                    Find Friends
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card flex items-center gap-4"
                  >
                    <img
                      src={getAvatarUrl(request.user?.username || 'User', request.user?.avatar_url)}
                      alt={request.user?.username || 'User'}
                      className="w-14 h-14 rounded-full cursor-pointer"
                      onClick={() => router.push(`/profile/${request.user?.id}`)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg truncate">{request.user?.username}</p>
                      <p className="text-sm text-dark-400">
                        {formatElo(request.user?.elo_rating || 1000)} ELO • Sent friend request
                      </p>
                      <p className="text-xs text-dark-500 mt-0.5">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-colors"
                        title="Accept"
                      >
                        {actionLoading === request.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                        ) : (
                          <Check className="w-5 h-5 text-green-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-colors"
                        title="Decline"
                      >
                        <X className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="card text-center py-12">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                  <h3 className="text-xl font-bold mb-2">No Pending Requests</h3>
                  <p className="text-dark-400">Friend requests will appear here</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'outgoing' && (
            <motion.div
              key="outgoing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {outgoingRequests.length > 0 ? (
                outgoingRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card flex items-center gap-4"
                  >
                    <img
                      src={getAvatarUrl(request.friend?.username || 'User', request.friend?.avatar_url)}
                      alt={request.friend?.username || 'User'}
                      className="w-14 h-14 rounded-full cursor-pointer"
                      onClick={() => router.push(`/profile/${request.friend?.id}`)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg truncate">{request.friend?.username}</p>
                      <p className="text-sm text-dark-400">
                        {formatElo(request.friend?.elo_rating || 1000)} ELO • Request pending
                      </p>
                      <p className="text-xs text-dark-500 mt-0.5">
                        Sent {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={actionLoading === request.id}
                      className="p-3 bg-dark-700 hover:bg-red-500/20 rounded-xl transition-colors group"
                      title="Cancel request"
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-dark-400" />
                      ) : (
                        <X className="w-5 h-5 text-dark-400 group-hover:text-red-400" />
                      )}
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="card text-center py-12">
                  <Send className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                  <h3 className="text-xl font-bold mb-2">No Outgoing Requests</h3>
                  <p className="text-dark-400">Sent friend requests will appear here</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="input pl-12 pr-12 w-full"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
                )}
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result, index) => {
                    const rank = getEloRank(result.elo_rating)
                    const isOnline = isFriendOnline(result.id)
                    return (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="card flex items-center gap-4"
                      >
                        <div className="relative">
                          <img
                            src={getAvatarUrl(result.username, result.avatar_url)}
                            alt={result.username}
                            className="w-14 h-14 rounded-full cursor-pointer"
                            onClick={() => router.push(`/profile/${result.id}`)}
                          />
                          <OnlineIndicator isOnline={isOnline} />
                        </div>
                        <div
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => router.push(`/profile/${result.id}`)}
                        >
                          <p className="font-bold text-lg truncate">{result.username}</p>
                          <p className="text-sm text-dark-400">
                            <span className={rank.color}>{rank.icon} {formatElo(result.elo_rating)}</span>
                            {' • '}
                            {result.wins}W - {result.losses}L
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {result.friendshipStatus === 'friends' ? (
                            <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              Friends
                            </span>
                          ) : result.friendshipStatus === 'pending_outgoing' ? (
                            <span className="px-4 py-2 bg-dark-700 text-dark-400 rounded-xl text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Pending
                            </span>
                          ) : result.friendshipStatus === 'pending_incoming' ? (
                            <button
                              onClick={() => result.friendshipId && handleAcceptRequest(result.friendshipId)}
                              disabled={actionLoading === result.friendshipId}
                              className="btn-fire flex items-center gap-2"
                            >
                              {actionLoading === result.friendshipId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Accept
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendFriendRequest(result.id)}
                              disabled={actionLoading === result.id}
                              className="btn-purple flex items-center gap-2"
                            >
                              {actionLoading === result.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserPlus className="w-4 h-4" />
                              )}
                              Add Friend
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : searchQuery.length >= 2 && !searching ? (
                <div className="card text-center py-12">
                  <Search className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                  <h3 className="text-xl font-bold mb-2">No Results</h3>
                  <p className="text-dark-400">No users found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="card text-center py-12">
                  <Search className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                  <h3 className="text-xl font-bold mb-2">Find Rappers</h3>
                  <p className="text-dark-400">Search for users by their username</p>
                  <p className="text-xs text-dark-500 mt-2">Type at least 2 characters to search</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
