'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Trophy, User, Play, Eye, Crown, Swords, Check } from 'lucide-react'
import { TournamentMatch, Profile } from '@/lib/supabase'
import { getAvatarUrl, cn } from '@/lib/utils'

interface TournamentBracketProps {
  matches: TournamentMatch[]
  tournamentId: string
  onMatchClick?: (match: TournamentMatch) => void
  currentUserId?: string
  isDemo?: boolean
}

function MatchCard({
  match,
  onClick,
  isCurrentUser,
  roundIndex,
  totalRounds
}: {
  match: TournamentMatch
  onClick?: () => void
  isCurrentUser: boolean
  roundIndex: number
  totalRounds: number
}) {
  const isFinal = roundIndex === totalRounds - 1
  const isClickable = match.status === 'ready' || match.status === 'in_progress'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative bg-dark-800 rounded-xl border-2 transition-all duration-200 w-64",
        match.status === 'in_progress' && "border-fire-500 shadow-lg shadow-fire-500/20",
        match.status === 'ready' && isCurrentUser && "border-green-500 shadow-lg shadow-green-500/20",
        match.status === 'ready' && !isCurrentUser && "border-yellow-500/50",
        match.status === 'complete' && "border-dark-600",
        match.status === 'pending' && "border-dark-700 opacity-60",
        isClickable && "cursor-pointer hover:scale-105",
        isFinal && "ring-2 ring-gold-500/30"
      )}
      onClick={() => isClickable && onClick?.()}
    >
      {/* Status Badge */}
      {match.status === 'in_progress' && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-fire-500 rounded-full text-xs font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
      )}
      {match.status === 'ready' && isCurrentUser && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-green-500 rounded-full text-xs font-bold flex items-center gap-1">
          <Play className="w-3 h-3" />
          YOUR MATCH
        </div>
      )}
      {match.status === 'ready' && !isCurrentUser && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-yellow-500 rounded-full text-xs font-bold text-black">
          READY
        </div>
      )}
      {isFinal && match.status === 'pending' && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gold-500 rounded-full text-xs font-bold text-black flex items-center gap-1">
          <Trophy className="w-3 h-3" />
          FINALS
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Player 1 */}
        <PlayerSlot
          player={match.player1}
          isWinner={match.winner_id === match.player1_id}
          isEliminated={match.status === 'complete' && match.winner_id !== match.player1_id}
          seed={match.match_number * 2 - 1}
        />

        {/* VS Divider */}
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-dark-600" />
          <span className="text-xs text-dark-500 font-medium">VS</span>
          <div className="flex-1 h-px bg-dark-600" />
        </div>

        {/* Player 2 */}
        <PlayerSlot
          player={match.player2}
          isWinner={match.winner_id === match.player2_id}
          isEliminated={match.status === 'complete' && match.winner_id !== match.player2_id}
          seed={match.match_number * 2}
        />
      </div>

      {/* Action Hint */}
      {isClickable && (
        <div className="px-3 pb-2">
          <div className={cn(
            "text-xs text-center py-1.5 rounded-lg",
            match.status === 'in_progress' ? "bg-fire-500/20 text-fire-400" : "bg-green-500/20 text-green-400"
          )}>
            {match.status === 'in_progress' ? (
              <span className="flex items-center justify-center gap-1">
                <Eye className="w-3 h-3" /> Click to watch
              </span>
            ) : isCurrentUser ? (
              <span className="flex items-center justify-center gap-1">
                <Play className="w-3 h-3" /> Click to start
              </span>
            ) : (
              <span>Waiting for players</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function PlayerSlot({
  player,
  isWinner,
  isEliminated,
  seed
}: {
  player?: Profile
  isWinner: boolean
  isEliminated: boolean
  seed: number
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg transition-all",
      isWinner && "bg-green-500/20 ring-1 ring-green-500/50",
      isEliminated && "opacity-50",
      !player && "bg-dark-700/50"
    )}>
      {player ? (
        <>
          <div className="relative">
            <img
              src={getAvatarUrl(player.username, player.avatar_url)}
              alt={player.username}
              className="w-10 h-10 rounded-full"
            />
            {isWinner && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-semibold truncate",
              isWinner && "text-green-400",
              isEliminated && "line-through text-dark-500"
            )}>
              {player.username}
            </p>
            <p className="text-xs text-dark-400">{player.elo_rating} ELO</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center">
            <User className="w-5 h-5 text-dark-500" />
          </div>
          <div className="flex-1">
            <p className="text-dark-500 font-medium">TBD</p>
            <p className="text-xs text-dark-600">Seed #{seed}</p>
          </div>
        </>
      )}
    </div>
  )
}

export default function TournamentBracket({
  matches,
  tournamentId: _tournamentId,
  onMatchClick,
  currentUserId,
  isDemo: _isDemo = false
}: TournamentBracketProps) {
  // Unused but kept for API compatibility
  void _tournamentId
  void _isDemo
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = []
    acc[match.round].push(match)
    return acc
  }, {} as Record<number, TournamentMatch[]>)

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b)
  const totalRounds = rounds.length

  const getRoundName = (round: number) => {
    const remaining = totalRounds - round + 1
    if (remaining === 1) return 'Finals'
    if (remaining === 2) return 'Semifinals'
    if (remaining === 3) return 'Quarterfinals'
    if (remaining === 4) return 'Round of 16'
    return `Round ${round}`
  }

  const isUserInMatch = (match: TournamentMatch) => {
    return match.player1_id === currentUserId || match.player2_id === currentUserId
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Swords className="w-16 h-16 mx-auto mb-4 text-dark-600" />
        <h3 className="text-xl font-bold mb-2">Bracket Not Generated</h3>
        <p className="text-dark-400">The bracket will be created once registration closes</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Round Selector for Mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => setSelectedRound(selectedRound === round ? null : round)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all",
              selectedRound === round || selectedRound === null
                ? "bg-gold-500 text-black"
                : "bg-dark-800 text-dark-400"
            )}
          >
            {getRoundName(round)}
          </button>
        ))}
      </div>

      {/* Bracket Container */}
      <div ref={containerRef} className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max p-4">
          {rounds.map((round, roundIndex) => {
            const roundMatches = matchesByRound[round] || []
            const nextRoundMatches = matchesByRound[round + 1]?.length || 0

            // On mobile, only show selected round or all if none selected
            const showOnMobile = selectedRound === null || selectedRound === round

            return (
              <div
                key={round}
                className={cn(
                  "flex flex-col relative",
                  !showOnMobile && "hidden md:flex"
                )}
              >
                {/* Round Header */}
                <div className="text-center mb-4">
                  <h3 className={cn(
                    "font-bold text-lg",
                    roundIndex === totalRounds - 1 ? "text-gold-400" : "text-dark-300"
                  )}>
                    {getRoundName(round)}
                  </h3>
                  <p className="text-xs text-dark-500">
                    {roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'}
                  </p>
                </div>

                {/* Matches */}
                <div
                  className="flex flex-col justify-around flex-1 gap-4"
                  style={{
                    paddingTop: roundIndex > 0 ? `${Math.pow(2, roundIndex - 1) * 70}px` : 0,
                    gap: `${Math.pow(2, roundIndex) * 16 + 16}px`
                  }}
                >
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onClick={() => onMatchClick?.(match)}
                      isCurrentUser={isUserInMatch(match)}
                      roundIndex={roundIndex}
                      totalRounds={totalRounds}
                    />
                  ))}
                </div>

                {/* Connector Lines (desktop only) */}
                {roundIndex < totalRounds - 1 && nextRoundMatches > 0 && (
                  <div className="hidden md:block absolute top-0 right-0 w-8 h-full translate-x-full">
                    {/* Simple connector visualization */}
                  </div>
                )}
              </div>
            )
          })}

          {/* Champion Display */}
          {totalRounds > 0 && matchesByRound[totalRounds]?.[0]?.winner_id && (
            <div className="flex flex-col items-center justify-center ml-4">
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg text-gold-400">Champion</h3>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-gradient-to-br from-gold-500/30 to-gold-600/20 rounded-2xl p-6 border-2 border-gold-500"
              >
                <div className="relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                    <Crown className="w-10 h-10 text-gold-400" />
                  </div>
                  <img
                    src={getAvatarUrl(
                      matchesByRound[totalRounds][0].winner_id === matchesByRound[totalRounds][0].player1_id
                        ? matchesByRound[totalRounds][0].player1?.username || ''
                        : matchesByRound[totalRounds][0].player2?.username || '',
                      matchesByRound[totalRounds][0].winner_id === matchesByRound[totalRounds][0].player1_id
                        ? matchesByRound[totalRounds][0].player1?.avatar_url
                        : matchesByRound[totalRounds][0].player2?.avatar_url
                    )}
                    alt="Champion"
                    className="w-20 h-20 rounded-full border-4 border-gold-500 mx-auto mb-3"
                  />
                  <p className="text-center font-bold text-gold-400 text-lg">
                    {matchesByRound[totalRounds][0].winner_id === matchesByRound[totalRounds][0].player1_id
                      ? matchesByRound[totalRounds][0].player1?.username
                      : matchesByRound[totalRounds][0].player2?.username}
                  </p>
                  <p className="text-center text-dark-400 text-sm mt-1">Tournament Champion</p>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-fire-500" />
          <span className="text-dark-400">Live Match</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-dark-400">Your Match</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-dark-400">Ready</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-dark-600" />
          <span className="text-dark-400">Pending</span>
        </div>
      </div>
    </div>
  )
}
