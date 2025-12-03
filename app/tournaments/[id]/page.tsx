'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Trophy, Users, Calendar, Clock, Crown, ArrowLeft,
  Swords, Gift, ChevronRight, Check, X, User
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Tournament, TournamentParticipant, TournamentMatch,
  getTournament, getTournamentParticipants, getTournamentMatches,
  joinTournament, leaveTournament, isUserInTournament
} from '@/lib/supabase'
import { getAvatarUrl, cn } from '@/lib/utils'

// Demo data
const DEMO_TOURNAMENT: Tournament = {
  id: 'demo-1',
  name: 'Weekly Freestyle Championship',
  description: 'Compete against the best rappers for glory and bragging rights! Single elimination format with 60-second rounds.',
  format: 'single_elimination',
  max_participants: 8,
  current_participants: 8,
  status: 'in_progress',
  prize_pool: '500 coins',
  entry_fee: 0,
  starts_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  registration_ends_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  created_by: 'demo-admin',
  winner_id: null
}

const DEMO_PARTICIPANTS: TournamentParticipant[] = [
  { id: '1', tournament_id: 'demo-1', user_id: 'u1', seed: 1, eliminated: false, placement: null, joined_at: '', user: { id: 'u1', username: 'MC_Fire', avatar_url: null, elo_rating: 1450, wins: 25, losses: 8, total_battles: 33, created_at: '', updated_at: '' } },
  { id: '2', tournament_id: 'demo-1', user_id: 'u2', seed: 2, eliminated: false, placement: null, joined_at: '', user: { id: 'u2', username: 'IceKing', avatar_url: null, elo_rating: 1380, wins: 20, losses: 10, total_battles: 30, created_at: '', updated_at: '' } },
  { id: '3', tournament_id: 'demo-1', user_id: 'u3', seed: 3, eliminated: true, placement: 5, joined_at: '', user: { id: 'u3', username: 'BeatDropper', avatar_url: null, elo_rating: 1320, wins: 18, losses: 12, total_battles: 30, created_at: '', updated_at: '' } },
  { id: '4', tournament_id: 'demo-1', user_id: 'u4', seed: 4, eliminated: true, placement: 5, joined_at: '', user: { id: 'u4', username: 'RhymeTime', avatar_url: null, elo_rating: 1290, wins: 15, losses: 10, total_battles: 25, created_at: '', updated_at: '' } },
  { id: '5', tournament_id: 'demo-1', user_id: 'u5', seed: 5, eliminated: false, placement: null, joined_at: '', user: { id: 'u5', username: 'FlowMaster', avatar_url: null, elo_rating: 1260, wins: 14, losses: 8, total_battles: 22, created_at: '', updated_at: '' } },
  { id: '6', tournament_id: 'demo-1', user_id: 'u6', seed: 6, eliminated: true, placement: 5, joined_at: '', user: { id: 'u6', username: 'WordSmith', avatar_url: null, elo_rating: 1240, wins: 12, losses: 9, total_battles: 21, created_at: '', updated_at: '' } },
  { id: '7', tournament_id: 'demo-1', user_id: 'u7', seed: 7, eliminated: false, placement: null, joined_at: '', user: { id: 'u7', username: 'LyricLord', avatar_url: null, elo_rating: 1220, wins: 11, losses: 8, total_battles: 19, created_at: '', updated_at: '' } },
  { id: '8', tournament_id: 'demo-1', user_id: 'u8', seed: 8, eliminated: true, placement: 5, joined_at: '', user: { id: 'u8', username: 'VerseMaster', avatar_url: null, elo_rating: 1180, wins: 10, losses: 10, total_battles: 20, created_at: '', updated_at: '' } },
]

const DEMO_MATCHES: TournamentMatch[] = [
  // Round 1 (Quarterfinals)
  { id: 'm1', tournament_id: 'demo-1', round: 1, match_number: 1, player1_id: 'u1', player2_id: 'u8', winner_id: 'u1', battle_id: null, scheduled_at: null, status: 'complete', player1: DEMO_PARTICIPANTS[0].user, player2: DEMO_PARTICIPANTS[7].user },
  { id: 'm2', tournament_id: 'demo-1', round: 1, match_number: 2, player1_id: 'u4', player2_id: 'u5', winner_id: 'u5', battle_id: null, scheduled_at: null, status: 'complete', player1: DEMO_PARTICIPANTS[3].user, player2: DEMO_PARTICIPANTS[4].user },
  { id: 'm3', tournament_id: 'demo-1', round: 1, match_number: 3, player1_id: 'u3', player2_id: 'u6', winner_id: 'u6', battle_id: null, scheduled_at: null, status: 'complete', player1: DEMO_PARTICIPANTS[2].user, player2: DEMO_PARTICIPANTS[5].user },
  { id: 'm4', tournament_id: 'demo-1', round: 1, match_number: 4, player1_id: 'u2', player2_id: 'u7', winner_id: 'u2', battle_id: null, scheduled_at: null, status: 'complete', player1: DEMO_PARTICIPANTS[1].user, player2: DEMO_PARTICIPANTS[6].user },
  // Round 2 (Semifinals)
  { id: 'm5', tournament_id: 'demo-1', round: 2, match_number: 1, player1_id: 'u1', player2_id: 'u5', winner_id: null, battle_id: null, scheduled_at: null, status: 'ready', player1: DEMO_PARTICIPANTS[0].user, player2: DEMO_PARTICIPANTS[4].user },
  { id: 'm6', tournament_id: 'demo-1', round: 2, match_number: 2, player1_id: 'u6', player2_id: 'u2', winner_id: 'u2', battle_id: null, scheduled_at: null, status: 'complete', player1: DEMO_PARTICIPANTS[5].user, player2: DEMO_PARTICIPANTS[1].user },
  // Round 3 (Finals)
  { id: 'm7', tournament_id: 'demo-1', round: 3, match_number: 1, player1_id: null, player2_id: 'u2', winner_id: null, battle_id: null, scheduled_at: null, status: 'pending', player1: undefined, player2: DEMO_PARTICIPANTS[1].user },
]

export default function TournamentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tournamentId = params.id as string

  const { user, isDemo } = useUserStore()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<TournamentParticipant[]>([])
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [isJoined, setIsJoined] = useState(false)
  const [activeTab, setActiveTab] = useState<'bracket' | 'participants'>('bracket')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadTournament()
  }, [user, router, tournamentId])

  async function loadTournament() {
    setLoading(true)

    if (isDemo || tournamentId.startsWith('demo-')) {
      setTournament(DEMO_TOURNAMENT)
      setParticipants(DEMO_PARTICIPANTS)
      setMatches(DEMO_MATCHES)
      setIsJoined(false)
    } else {
      const [tournamentData, participantsData, matchesData, joined] = await Promise.all([
        getTournament(tournamentId),
        getTournamentParticipants(tournamentId),
        getTournamentMatches(tournamentId),
        user ? isUserInTournament(tournamentId, user.id) : false
      ])

      if (tournamentData) {
        setTournament(tournamentData)
        setParticipants(participantsData)
        setMatches(matchesData)
        setIsJoined(joined)
      } else {
        // Fall back to demo
        setTournament(DEMO_TOURNAMENT)
        setParticipants(DEMO_PARTICIPANTS)
        setMatches(DEMO_MATCHES)
      }
    }

    setLoading(false)
  }

  async function handleJoin() {
    if (!user || !tournament) return

    const success = await joinTournament(tournament.id, user.id)
    if (success) {
      setIsJoined(true)
      loadTournament()
    }
  }

  async function handleLeave() {
    if (!user || !tournament) return

    const success = await leaveTournament(tournament.id, user.id)
    if (success) {
      setIsJoined(false)
      loadTournament()
    }
  }

  function getRoundName(round: number, totalRounds: number) {
    const remaining = totalRounds - round + 1
    if (remaining === 1) return 'Finals'
    if (remaining === 2) return 'Semifinals'
    if (remaining === 3) return 'Quarterfinals'
    return `Round ${round}`
  }

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = []
    acc[match.round].push(match)
    return acc
  }, {} as Record<number, TournamentMatch[]>)

  const totalRounds = Math.max(...Object.keys(matchesByRound).map(Number), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!tournament || !user) return null

  const canJoin = tournament.status === 'registration' &&
    tournament.current_participants < tournament.max_participants &&
    !isJoined

  const canLeave = tournament.status === 'registration' && isJoined

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-900/10 via-dark-950 to-fire-900/10" />

      <div className="relative max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={() => router.push('/tournaments')}
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tournaments
        </button>

        {/* Tournament Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Icon */}
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center shrink-0",
              tournament.status === 'complete' ? 'bg-gold-500/20' : 'bg-fire-500/20'
            )}>
              {tournament.status === 'complete' ? (
                <Crown className="w-10 h-10 text-gold-400" />
              ) : (
                <Trophy className="w-10 h-10 text-fire-400" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{tournament.name}</h1>
                  <p className="text-dark-400 mt-1">{tournament.description}</p>
                </div>

                <span className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-full shrink-0",
                  tournament.status === 'in_progress' ? 'bg-fire-500/20 text-fire-400' :
                  tournament.status === 'registration' ? 'bg-green-500/20 text-green-400' :
                  tournament.status === 'complete' ? 'bg-gold-500/20 text-gold-400' :
                  'bg-blue-500/20 text-blue-400'
                )}>
                  {tournament.status === 'in_progress' ? 'LIVE' :
                   tournament.status === 'registration' ? 'OPEN' :
                   tournament.status === 'complete' ? 'FINISHED' : 'UPCOMING'}
                </span>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-dark-500" />
                  <span>{tournament.current_participants}/{tournament.max_participants} Players</span>
                </div>
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-dark-500" />
                  <span className="capitalize">{tournament.format.replace('_', ' ')}</span>
                </div>
                {tournament.prize_pool && (
                  <div className="flex items-center gap-2 text-gold-400">
                    <Gift className="w-4 h-4" />
                    <span>{tournament.prize_pool}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-dark-500" />
                  <span>{new Date(tournament.starts_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Winner */}
              {tournament.winner && (
                <div className="flex items-center gap-3 mt-4 p-3 bg-gold-500/10 rounded-xl border border-gold-500/30">
                  <Crown className="w-5 h-5 text-gold-400" />
                  <img
                    src={getAvatarUrl(tournament.winner.username, tournament.winner.avatar_url)}
                    alt={tournament.winner.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-bold text-gold-400">{tournament.winner.username}</span>
                  <span className="text-dark-400">Champion</span>
                </div>
              )}
            </div>
          </div>

          {/* Join/Leave Button */}
          {(canJoin || canLeave) && (
            <div className="mt-6 pt-6 border-t border-dark-700">
              {canJoin ? (
                <button onClick={handleJoin} className="btn-fire w-full md:w-auto">
                  Join Tournament
                </button>
              ) : canLeave ? (
                <button onClick={handleLeave} className="btn-dark w-full md:w-auto">
                  Leave Tournament
                </button>
              ) : null}
            </div>
          )}

          {isJoined && tournament.status !== 'registration' && (
            <div className="mt-6 pt-6 border-t border-dark-700">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">You're in this tournament!</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('bracket')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all",
              activeTab === 'bracket'
                ? 'bg-gold-500 text-black'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            Bracket
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all",
              activeTab === 'participants'
                ? 'bg-gold-500 text-black'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            Participants ({participants.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'bracket' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card overflow-x-auto"
          >
            <h2 className="text-xl font-bold mb-6">Tournament Bracket</h2>

            {matches.length > 0 ? (
              <div className="flex gap-8 min-w-max pb-4">
                {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
                  <div key={round} className="flex flex-col gap-4">
                    <h3 className="text-center font-medium text-dark-400 mb-2">
                      {getRoundName(round, totalRounds)}
                    </h3>

                    <div className="flex flex-col justify-around flex-1 gap-4">
                      {matchesByRound[round]?.map((match) => (
                        <div
                          key={match.id}
                          className={cn(
                            "bg-dark-800 rounded-xl p-3 w-56 border",
                            match.status === 'in_progress' ? 'border-fire-500/50' :
                            match.status === 'complete' ? 'border-dark-600' :
                            match.status === 'ready' ? 'border-green-500/50' :
                            'border-dark-700'
                          )}
                        >
                          {/* Match status */}
                          {match.status === 'in_progress' && (
                            <div className="text-xs text-fire-400 font-medium mb-2 flex items-center gap-1">
                              <span className="w-2 h-2 bg-fire-500 rounded-full animate-pulse" />
                              LIVE
                            </div>
                          )}
                          {match.status === 'ready' && (
                            <div className="text-xs text-green-400 font-medium mb-2">
                              Ready to Start
                            </div>
                          )}

                          {/* Player 1 */}
                          <div className={cn(
                            "flex items-center gap-2 p-2 rounded-lg",
                            match.winner_id === match.player1_id ? 'bg-green-500/20' : 'bg-dark-700/50'
                          )}>
                            {match.player1 ? (
                              <>
                                <img
                                  src={getAvatarUrl(match.player1.username, match.player1.avatar_url)}
                                  alt={match.player1.username}
                                  className="w-8 h-8 rounded-full"
                                />
                                <span className="font-medium truncate flex-1">{match.player1.username}</span>
                                {match.winner_id === match.player1_id && (
                                  <Check className="w-4 h-4 text-green-400" />
                                )}
                              </>
                            ) : (
                              <>
                                <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center">
                                  <User className="w-4 h-4 text-dark-500" />
                                </div>
                                <span className="text-dark-500">TBD</span>
                              </>
                            )}
                          </div>

                          {/* VS */}
                          <div className="text-center text-xs text-dark-500 py-1">vs</div>

                          {/* Player 2 */}
                          <div className={cn(
                            "flex items-center gap-2 p-2 rounded-lg",
                            match.winner_id === match.player2_id ? 'bg-green-500/20' : 'bg-dark-700/50'
                          )}>
                            {match.player2 ? (
                              <>
                                <img
                                  src={getAvatarUrl(match.player2.username, match.player2.avatar_url)}
                                  alt={match.player2.username}
                                  className="w-8 h-8 rounded-full"
                                />
                                <span className="font-medium truncate flex-1">{match.player2.username}</span>
                                {match.winner_id === match.player2_id && (
                                  <Check className="w-4 h-4 text-green-400" />
                                )}
                              </>
                            ) : (
                              <>
                                <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center">
                                  <User className="w-4 h-4 text-dark-500" />
                                </div>
                                <span className="text-dark-500">TBD</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-dark-400">
                <Swords className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Bracket not generated yet</p>
                <p className="text-sm">The bracket will be created once registration closes</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'participants' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <h2 className="text-xl font-bold mb-6">Participants</h2>

            {participants.length > 0 ? (
              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    onClick={() => participant.user && router.push(`/profile/${participant.user.id}`)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                      participant.eliminated
                        ? 'bg-dark-800/50 opacity-60'
                        : 'bg-dark-800 hover:bg-dark-700'
                    )}
                  >
                    {/* Seed */}
                    <span className={cn(
                      "w-8 text-center font-bold",
                      index === 0 ? 'text-gold-400' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-500' :
                      'text-dark-500'
                    )}>
                      #{participant.seed || index + 1}
                    </span>

                    {/* Avatar */}
                    <img
                      src={getAvatarUrl(participant.user?.username || 'Unknown', participant.user?.avatar_url)}
                      alt={participant.user?.username || 'Unknown'}
                      className="w-12 h-12 rounded-full"
                    />

                    {/* Info */}
                    <div className="flex-1">
                      <p className="font-bold">{participant.user?.username || 'Unknown'}</p>
                      <p className="text-sm text-dark-400">
                        {participant.user?.elo_rating} ELO
                      </p>
                    </div>

                    {/* Status */}
                    {participant.eliminated ? (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                        Eliminated
                      </span>
                    ) : tournament.winner_id === participant.user_id ? (
                      <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-1 rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Champion
                      </span>
                    ) : tournament.status === 'in_progress' ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                        Active
                      </span>
                    ) : null}

                    <ChevronRight className="w-5 h-5 text-dark-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-dark-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No participants yet</p>
                <p className="text-sm">Be the first to join!</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
