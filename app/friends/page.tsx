'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, UserMinus, Search, ArrowLeft, ChevronRight,
  Swords, Check, X, Clock, MessageCircle
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Profile, Friendship,
  getFriends, getPendingFriendRequests, acceptFriendRequest, removeFriend,
  sendFriendRequest, getFriendshipStatus
} from '@/lib/supabase'
import { getAvatarUrl, formatElo, getEloRank, cn } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'

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

type Tab = 'friends' | 'pending' | 'search'

export default function FriendsPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const sounds = useSounds()

  const [activeTab, setActiveTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Profile[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)

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
    } else {
      const [friendsData, pendingData] = await Promise.all([
        getFriends(user!.id),
        getPendingFriendRequests(user!.id)
      ])
      setFriends(friendsData)
      setPendingRequests(pendingData)
    }
    setLoading(false)
  }

  async function handleAcceptRequest(friendshipId: string) {
    sounds.play('notification')
    if (isDemo) {
      setPendingRequests(prev => prev.filter(p => p.id !== friendshipId))
      return
    }
    const success = await acceptFriendRequest(friendshipId)
    if (success) {
      loadData()
    }
  }

  async function handleRejectRequest(friendshipId: string) {
    if (isDemo) {
      setPendingRequests(prev => prev.filter(p => p.id !== friendshipId))
      return
    }
    // For now, just remove from pending - could add a reject function
    setPendingRequests(prev => prev.filter(p => p.id !== friendshipId))
  }

  async function handleRemoveFriend(friendId: string) {
    if (isDemo) {
      setFriends(prev => prev.filter(f => f.id !== friendId))
      return
    }
    const success = await removeFriend(user!.id, friendId)
    if (success) {
      setFriends(prev => prev.filter(f => f.id !== friendId))
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    // In demo mode, just filter demo friends
    if (isDemo) {
      const results = DEMO_FRIENDS.filter(f =>
        f.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setSearchResults(results)
    }
    setSearching(false)
  }

  function handleChallenge(friendId: string) {
    sounds.play('button_click')
    router.push(`/battle/create?challenge=${friendId}`)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-dark-950 to-fire-900/10" />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              Friends
            </h1>
            <p className="text-dark-400 mt-1">{friends.length} friends</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('friends')}
            className={cn(
              "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
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
              "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 relative",
              activeTab === 'pending'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Clock className="w-4 h-4" />
            Pending
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-fire-500 rounded-full text-xs flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
              activeTab === 'search'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Search className="w-4 h-4" />
            Search
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
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : friends.length > 0 ? (
                friends.map((friend, index) => {
                  const rank = getEloRank(friend.elo_rating)
                  return (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="card flex items-center gap-4"
                    >
                      <img
                        src={getAvatarUrl(friend.username, friend.avatar_url)}
                        alt={friend.username}
                        className="w-14 h-14 rounded-full cursor-pointer"
                        onClick={() => router.push(`/profile/${friend.id}`)}
                      />
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/profile/${friend.id}`)}
                      >
                        <p className="font-bold text-lg">{friend.username}</p>
                        <p className="text-sm text-dark-400">
                          <span className={rank.color}>{rank.icon} {formatElo(friend.elo_rating)}</span>
                          {' • '}
                          {friend.wins}W - {friend.losses}L
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleChallenge(friend.id)}
                          className="p-3 bg-fire-500/20 hover:bg-fire-500/30 rounded-xl transition-colors"
                          title="Challenge to battle"
                        >
                          <Swords className="w-5 h-5 text-fire-400" />
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
                          title="Remove friend"
                        >
                          <UserMinus className="w-5 h-5 text-dark-400" />
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
                      className="w-14 h-14 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-lg">{request.user?.username}</p>
                      <p className="text-sm text-dark-400">
                        {request.user?.elo_rating} ELO • Sent friend request
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="p-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-colors"
                        title="Accept"
                      >
                        <Check className="w-5 h-5 text-green-400" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
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

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by username..."
                  className="input flex-1"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="btn-fire px-6"
                >
                  {searching ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <div key={result.id} className="card flex items-center gap-4">
                      <img
                        src={getAvatarUrl(result.username, result.avatar_url)}
                        alt={result.username}
                        className="w-14 h-14 rounded-full cursor-pointer"
                        onClick={() => router.push(`/profile/${result.id}`)}
                      />
                      <div className="flex-1">
                        <p className="font-bold text-lg">{result.username}</p>
                        <p className="text-sm text-dark-400">{result.elo_rating} ELO</p>
                      </div>
                      <button className="btn-fire flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
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
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
