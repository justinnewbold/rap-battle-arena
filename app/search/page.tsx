'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, Users, User, Trophy, ChevronRight,
  Swords, Crown, X
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import { Profile, Crew, searchCrews, searchUsers } from '@/lib/supabase'
import { cn, getAvatarUrl, formatElo, getEloRank } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'

// Demo data
const DEMO_USERS: Profile[] = [
  { id: 'u1', username: 'MC_Thunder', avatar_url: null, elo_rating: 1650, wins: 34, losses: 12, total_battles: 46, created_at: '', updated_at: '' },
  { id: 'u2', username: 'LyricQueen', avatar_url: null, elo_rating: 1580, wins: 28, losses: 14, total_battles: 42, created_at: '', updated_at: '' },
  { id: 'u3', username: 'FlowKing', avatar_url: null, elo_rating: 1520, wins: 22, losses: 16, total_battles: 38, created_at: '', updated_at: '' },
  { id: 'u4', username: 'BeatMaster', avatar_url: null, elo_rating: 1480, wins: 25, losses: 20, total_battles: 45, created_at: '', updated_at: '' },
  { id: 'u5', username: 'RhymeTime', avatar_url: null, elo_rating: 1320, wins: 18, losses: 15, total_battles: 33, created_at: '', updated_at: '' },
  { id: 'u6', username: 'WordSmith', avatar_url: null, elo_rating: 1150, wins: 10, losses: 8, total_battles: 18, created_at: '', updated_at: '' },
  { id: 'u7', username: 'BarSpitter', avatar_url: null, elo_rating: 1420, wins: 20, losses: 15, total_battles: 35, created_at: '', updated_at: '' },
  { id: 'u8', username: 'MicDropper', avatar_url: null, elo_rating: 1380, wins: 17, losses: 14, total_battles: 31, created_at: '', updated_at: '' },
]

const DEMO_CREWS: Crew[] = [
  { id: 'c1', name: 'Mic Droppers', tag: 'MIC', description: 'Elite squad', avatar_url: null, banner_url: null, leader_id: 'u1', total_wins: 45, total_losses: 12, elo_rating: 1850, created_at: '', updated_at: '', leader: DEMO_USERS[0] },
  { id: 'c2', name: 'Flow State', tag: 'FLO', description: 'Smooth flows', avatar_url: null, banner_url: null, leader_id: 'u2', total_wins: 38, total_losses: 15, elo_rating: 1720, created_at: '', updated_at: '', leader: DEMO_USERS[1] },
  { id: 'c3', name: 'Bar Raisers', tag: 'BAR', description: 'Raising the bar', avatar_url: null, banner_url: null, leader_id: 'u3', total_wins: 32, total_losses: 18, elo_rating: 1620, created_at: '', updated_at: '', leader: DEMO_USERS[2] },
]

type SearchTab = 'all' | 'users' | 'crews'

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isDemo } = useUserStore()
  const sounds = useSounds()

  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [tab, setTab] = useState<SearchTab>('all')
  const [users, setUsers] = useState<Profile[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    // Load recent searches from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recent_searches')
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    }
  }, [])

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
  }, [initialQuery])

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setHasSearched(true)
    sounds.play('button_click')

    // Save to recent searches
    const updatedSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updatedSearches)
    if (typeof window !== 'undefined') {
      localStorage.setItem('recent_searches', JSON.stringify(updatedSearches))
    }

    if (isDemo) {
      // Filter demo data
      const filteredUsers = DEMO_USERS.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
      const filteredCrews = DEMO_CREWS.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setUsers(filteredUsers)
      setCrews(filteredCrews)
    } else {
      // Fetch from API in parallel
      const [userResults, crewResults] = await Promise.all([
        searchUsers(searchQuery),
        searchCrews(searchQuery)
      ])
      setUsers(userResults)
      setCrews(crewResults)
    }

    setLoading(false)
  }, [isDemo, recentSearches, sounds])

  function clearRecentSearches() {
    setRecentSearches([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem('recent_searches')
    }
  }

  const totalResults = users.length + crews.length
  const filteredUsers = tab === 'all' || tab === 'users' ? users : []
  const filteredCrews = tab === 'all' || tab === 'crews' ? crews : []

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-ice-900/10 via-dark-950 to-purple-900/10" />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Search</h1>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="Search users, crews..."
            className="input pl-12 pr-12 text-lg"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Recent Searches */}
        {!hasSearched && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-dark-400">Recent Searches</h3>
              <button
                onClick={clearRecentSearches}
                className="text-xs text-dark-500 hover:text-dark-300"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search)
                    handleSearch(search)
                  }}
                  className="px-3 py-1.5 bg-dark-800 rounded-full text-sm text-dark-300 hover:bg-dark-700 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search Button */}
        <button
          onClick={() => handleSearch(query)}
          disabled={!query.trim() || loading}
          className="w-full btn-fire mb-6 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>

        {/* Results */}
        {hasSearched && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab('all')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm transition-colors",
                  tab === 'all'
                    ? "bg-fire-500 text-white"
                    : "bg-dark-800 text-dark-400 hover:text-white"
                )}
              >
                All ({totalResults})
              </button>
              <button
                onClick={() => setTab('users')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                  tab === 'users'
                    ? "bg-fire-500 text-white"
                    : "bg-dark-800 text-dark-400 hover:text-white"
                )}
              >
                <User className="w-4 h-4" />
                Users ({users.length})
              </button>
              <button
                onClick={() => setTab('crews')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                  tab === 'crews'
                    ? "bg-fire-500 text-white"
                    : "bg-dark-800 text-dark-400 hover:text-white"
                )}
              >
                <Users className="w-4 h-4" />
                Crews ({crews.length})
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : totalResults === 0 ? (
              <div className="card text-center py-12">
                <Search className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                <h3 className="text-xl font-bold mb-2">No Results Found</h3>
                <p className="text-dark-400">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Users */}
                {filteredUsers.length > 0 && (
                  <div className="space-y-2">
                    {tab === 'all' && (
                      <h3 className="text-sm font-medium text-dark-400 mb-2">Users</h3>
                    )}
                    <AnimatePresence>
                      {filteredUsers.map((profile, index) => {
                        const rank = getEloRank(profile.elo_rating)
                        return (
                          <motion.div
                            key={profile.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => router.push(`/profile/${profile.id}`)}
                            className="card py-3 flex items-center gap-4 cursor-pointer hover:border-dark-600 transition-colors"
                          >
                            <img
                              src={getAvatarUrl(profile.username, profile.avatar_url)}
                              alt={profile.username}
                              className="w-12 h-12 rounded-full bg-dark-700"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold">{profile.username}</div>
                              <div className="text-sm text-dark-400">
                                <span className={rank.color}>{rank.icon} {formatElo(profile.elo_rating)}</span>
                                {' • '}
                                {profile.wins}W - {profile.losses}L
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-dark-500" />
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* Crews */}
                {filteredCrews.length > 0 && (
                  <div className="space-y-2">
                    {tab === 'all' && filteredUsers.length > 0 && (
                      <h3 className="text-sm font-medium text-dark-400 mb-2 mt-4">Crews</h3>
                    )}
                    {tab === 'all' && filteredUsers.length === 0 && (
                      <h3 className="text-sm font-medium text-dark-400 mb-2">Crews</h3>
                    )}
                    <AnimatePresence>
                      {filteredCrews.map((crew, index) => (
                        <motion.div
                          key={crew.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (filteredUsers.length + index) * 0.05 }}
                          onClick={() => router.push(`/crews/${crew.id}`)}
                          className="card py-3 flex items-center gap-4 cursor-pointer hover:border-dark-600 transition-colors"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fire-500 rounded-xl flex items-center justify-center font-bold">
                            [{crew.tag}]
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold flex items-center gap-2">
                              {crew.name}
                              <Users className="w-4 h-4 text-dark-500" />
                            </div>
                            <div className="text-sm text-dark-400">
                              <span className="text-purple-400">{crew.elo_rating} ELO</span>
                              {' • '}
                              <span className="text-green-400">{crew.total_wins}W</span>
                              {' - '}
                              <span className="text-fire-400">{crew.total_losses}L</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-dark-500" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Quick Links when no search */}
        {!hasSearched && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-dark-400">Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/leaderboard')}
                className="card py-4 flex items-center gap-3 hover:border-dark-600 transition-colors"
              >
                <Trophy className="w-5 h-5 text-gold-400" />
                <span>Leaderboard</span>
              </button>
              <button
                onClick={() => router.push('/crews')}
                className="card py-4 flex items-center gap-3 hover:border-dark-600 transition-colors"
              >
                <Users className="w-5 h-5 text-purple-400" />
                <span>Browse Crews</span>
              </button>
              <button
                onClick={() => router.push('/friends')}
                className="card py-4 flex items-center gap-3 hover:border-dark-600 transition-colors"
              >
                <User className="w-5 h-5 text-ice-400" />
                <span>Friends</span>
              </button>
              <button
                onClick={() => router.push('/tournaments')}
                className="card py-4 flex items-center gap-3 hover:border-dark-600 transition-colors"
              >
                <Swords className="w-5 h-5 text-fire-400" />
                <span>Tournaments</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-fire-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
