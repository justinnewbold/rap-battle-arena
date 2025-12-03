'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Trophy, Users, Calendar, Clock, Crown, ArrowLeft,
  ChevronRight, Swords, Plus, Gift, DollarSign
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Tournament, TournamentStatus, getTournaments
} from '@/lib/supabase'
import { getAvatarUrl, cn } from '@/lib/utils'

// Demo tournaments for testing
const DEMO_TOURNAMENTS: Tournament[] = [
  {
    id: 'demo-1',
    name: 'Weekly Freestyle Championship',
    description: 'Compete against the best rappers for glory and bragging rights!',
    format: 'single_elimination',
    max_participants: 16,
    current_participants: 12,
    status: 'registration',
    prize_pool: '500 coins',
    entry_fee: 0,
    starts_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    registration_ends_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    created_by: 'demo-admin',
    winner_id: null
  },
  {
    id: 'demo-2',
    name: 'Midnight Battle Royale',
    description: 'Late night battles for the night owls',
    format: 'single_elimination',
    max_participants: 8,
    current_participants: 8,
    status: 'in_progress',
    prize_pool: '250 coins',
    entry_fee: 0,
    starts_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    registration_ends_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    created_by: 'demo-admin',
    winner_id: null
  },
  {
    id: 'demo-3',
    name: 'Pro League Finals',
    description: 'The ultimate showdown between top-ranked players',
    format: 'double_elimination',
    max_participants: 32,
    current_participants: 32,
    status: 'complete',
    prize_pool: '2000 coins',
    entry_fee: 50,
    starts_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    registration_ends_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    created_by: 'demo-admin',
    winner_id: 'demo-winner',
    winner: {
      id: 'demo-winner',
      username: 'ChampionMC',
      avatar_url: null,
      elo_rating: 1850,
      wins: 45,
      losses: 8,
      total_battles: 53,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-4',
    name: 'Rookie Rumble',
    description: 'Tournament for new rappers under 1000 ELO',
    format: 'single_elimination',
    max_participants: 16,
    current_participants: 0,
    status: 'upcoming',
    prize_pool: '100 coins',
    entry_fee: 0,
    starts_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    registration_ends_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    created_by: 'demo-admin',
    winner_id: null
  }
]

export default function TournamentsPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TournamentStatus | 'all'>('all')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadTournaments()
  }, [user, router])

  async function loadTournaments() {
    setLoading(true)
    if (isDemo) {
      setTournaments(DEMO_TOURNAMENTS)
    } else {
      const data = await getTournaments()
      setTournaments(data.length > 0 ? data : DEMO_TOURNAMENTS)
    }
    setLoading(false)
  }

  const filteredTournaments = tournaments.filter(t =>
    filter === 'all' || t.status === filter
  )

  const statusCounts = {
    all: tournaments.length,
    upcoming: tournaments.filter(t => t.status === 'upcoming').length,
    registration: tournaments.filter(t => t.status === 'registration').length,
    in_progress: tournaments.filter(t => t.status === 'in_progress').length,
    complete: tournaments.filter(t => t.status === 'complete').length
  }

  function getStatusColor(status: TournamentStatus) {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-400'
      case 'registration': return 'bg-green-500/20 text-green-400'
      case 'in_progress': return 'bg-fire-500/20 text-fire-400'
      case 'complete': return 'bg-dark-500/20 text-dark-400'
    }
  }

  function getStatusLabel(status: TournamentStatus) {
    switch (status) {
      case 'upcoming': return 'Coming Soon'
      case 'registration': return 'Open'
      case 'in_progress': return 'Live'
      case 'complete': return 'Finished'
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  function getTimeUntil(dateString: string) {
    const now = new Date()
    const date = new Date(dateString)
    const diff = date.getTime() - now.getTime()

    if (diff < 0) return 'Started'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-900/10 via-dark-950 to-fire-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
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
                <Trophy className="w-8 h-8 text-gold-400" />
                Tournaments
              </h1>
              <p className="text-dark-400 mt-1">Compete for glory and prizes</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/tournaments/create')}
            className="btn-fire flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'registration', label: 'Open' },
            { id: 'in_progress', label: 'Live' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'complete', label: 'Past' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as TournamentStatus | 'all')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                filter === tab.id
                  ? 'bg-gold-500 text-black'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              )}
            >
              {tab.label}
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                filter === tab.id ? 'bg-black/20' : 'bg-dark-600'
              )}>
                {statusCounts[tab.id as keyof typeof statusCounts]}
              </span>
            </button>
          ))}
        </div>

        {/* Tournament List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTournaments.length > 0 ? (
          <div className="space-y-4">
            {filteredTournaments.map((tournament, index) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/tournaments/${tournament.id}`)}
                className="card cursor-pointer hover:border-gold-500/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Tournament Icon */}
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
                    tournament.status === 'in_progress' ? 'bg-fire-500/20' :
                    tournament.status === 'registration' ? 'bg-green-500/20' :
                    tournament.status === 'complete' ? 'bg-gold-500/20' :
                    'bg-blue-500/20'
                  )}>
                    {tournament.status === 'complete' ? (
                      <Crown className="w-7 h-7 text-gold-400" />
                    ) : tournament.status === 'in_progress' ? (
                      <Swords className="w-7 h-7 text-fire-400" />
                    ) : (
                      <Trophy className="w-7 h-7 text-gold-400" />
                    )}
                  </div>

                  {/* Tournament Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg truncate">{tournament.name}</h3>
                        <p className="text-sm text-dark-400 line-clamp-1">{tournament.description}</p>
                      </div>
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full shrink-0",
                        getStatusColor(tournament.status)
                      )}>
                        {getStatusLabel(tournament.status)}
                      </span>
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1 text-dark-400">
                        <Users className="w-4 h-4" />
                        <span>
                          {tournament.current_participants}/{tournament.max_participants}
                        </span>
                      </div>

                      {tournament.prize_pool && (
                        <div className="flex items-center gap-1 text-gold-400">
                          <Gift className="w-4 h-4" />
                          <span>{tournament.prize_pool}</span>
                        </div>
                      )}

                      {tournament.entry_fee > 0 && (
                        <div className="flex items-center gap-1 text-dark-400">
                          <DollarSign className="w-4 h-4" />
                          <span>{tournament.entry_fee} entry</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-dark-400">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateTime(tournament.starts_at)}</span>
                      </div>

                      {tournament.status !== 'complete' && (
                        <div className="flex items-center gap-1 text-ice-400">
                          <Clock className="w-4 h-4" />
                          <span>{getTimeUntil(tournament.starts_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Winner (for completed tournaments) */}
                    {tournament.status === 'complete' && tournament.winner && (
                      <div className="flex items-center gap-2 mt-3 p-2 bg-gold-500/10 rounded-lg">
                        <Crown className="w-4 h-4 text-gold-400" />
                        <img
                          src={getAvatarUrl(tournament.winner.username, tournament.winner.avatar_url)}
                          alt={tournament.winner.username}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm font-medium text-gold-400">
                          {tournament.winner.username}
                        </span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-dark-500 shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-dark-600" />
            <h3 className="text-xl font-bold mb-2">No Tournaments Found</h3>
            <p className="text-dark-400 mb-4">
              {filter === 'all'
                ? 'Check back later for upcoming tournaments'
                : `No ${filter.replace('_', ' ')} tournaments right now`
              }
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="btn-dark"
              >
                View All Tournaments
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
