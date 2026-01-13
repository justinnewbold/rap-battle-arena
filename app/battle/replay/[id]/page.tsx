'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Play, Pause, Share2, Trophy, Swords, Check,
  MessageSquare, Star, Mic, ChevronDown, ChevronUp, Users,
  Scissors, Download, Twitter, Link, Copy, X
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Battle, BattleRound, Vote,
  getBattleWithDetails
} from '@/lib/supabase'
import { getAvatarUrl, cn, formatDate } from '@/lib/utils'

// Demo data for testing
const DEMO_BATTLE: Battle = {
  id: 'demo-replay',
  room_code: 'ABC123',
  status: 'complete',
  player1_id: 'p1',
  player2_id: 'p2',
  winner_id: 'p1',
  current_round: 2,
  total_rounds: 2,
  beat_id: null,
  player1_total_score: 85.5,
  player2_total_score: 78.2,
  created_at: new Date(Date.now() - 86400000).toISOString(),
  started_at: new Date(Date.now() - 86400000).toISOString(),
  completed_at: new Date(Date.now() - 86400000 + 600000).toISOString(),
  voting_style: 'overall',
  show_votes_during_battle: false,
  player1: {
    id: 'p1',
    username: 'MC_Fire',
    avatar_url: null,
    elo_rating: 1450,
    wins: 25,
    losses: 8,
    total_battles: 33,
    created_at: '',
    updated_at: ''
  },
  player2: {
    id: 'p2',
    username: 'IceKing',
    avatar_url: null,
    elo_rating: 1380,
    wins: 20,
    losses: 10,
    total_battles: 30,
    created_at: '',
    updated_at: ''
  }
}

const DEMO_ROUNDS: BattleRound[] = [
  // Round 1, Player 1
  {
    id: 'r1p1',
    battle_id: 'demo-replay',
    round_number: 1,
    player_id: 'p1',
    audio_url: null,
    transcript: "Yeah, I'm coming in hot, flames on the mic,\nIceKing about to melt, this ain't your night.\nMy flow's unstoppable, my rhymes are tight,\nYou're just a cold front, I'm the main highlight.\nSpittin' fire verses, watch me ignite,\nWhile you're freezing up, losing the fight.",
    duration: 45,
    rhyme_score: 8.5,
    flow_score: 9.0,
    punchlines_score: 8.0,
    delivery_score: 8.5,
    creativity_score: 7.5,
    rebuttal_score: null,
    total_score: 42.5,
    judge_feedback: "Strong opening with consistent fire/ice metaphor theme. Good flow and delivery with memorable punchlines.",
    ai_model_used: 'gpt-4-turbo',
    created_at: new Date(Date.now() - 86400000 + 60000).toISOString()
  },
  // Round 1, Player 2
  {
    id: 'r1p2',
    battle_id: 'demo-replay',
    round_number: 1,
    player_id: 'p2',
    audio_url: null,
    transcript: "You call yourself fire but you're just smoke,\nAll that heat talk? Man, that's a joke.\nI'm the Ice King, cold and composed,\nWhile your weak bars leave everyone froze.\nMy style's crystalline, yours is exposed,\nThis battle's over before it even closed.",
    duration: 42,
    rhyme_score: 8.0,
    flow_score: 7.5,
    punchlines_score: 8.5,
    delivery_score: 7.5,
    creativity_score: 8.0,
    rebuttal_score: 7.0,
    total_score: 38.5,
    judge_feedback: "Good rebuttal energy and creative wordplay. Could improve flow consistency.",
    ai_model_used: 'gpt-4-turbo',
    created_at: new Date(Date.now() - 86400000 + 120000).toISOString()
  },
  // Round 2, Player 1
  {
    id: 'r2p1',
    battle_id: 'demo-replay',
    round_number: 2,
    player_id: 'p1',
    audio_url: null,
    transcript: "Ice King, more like Ice Cube—you're outdated,\nYour frozen flow got me feeling so elated.\nI'm heating up, my bars are upgraded,\nYour kingdom's crumbling, thoroughly devastated.\nEvery line I drop is highly celebrated,\nYou're melting down, completely eliminated.",
    duration: 48,
    rhyme_score: 9.0,
    flow_score: 8.5,
    punchlines_score: 9.0,
    delivery_score: 8.5,
    creativity_score: 8.0,
    rebuttal_score: 8.5,
    total_score: 43.0,
    judge_feedback: "Excellent second round performance. Strong rebuttals and increased intensity.",
    ai_model_used: 'gpt-4-turbo',
    created_at: new Date(Date.now() - 86400000 + 300000).toISOString()
  },
  // Round 2, Player 2
  {
    id: 'r2p2',
    battle_id: 'demo-replay',
    round_number: 2,
    player_id: 'p2',
    audio_url: null,
    transcript: "Outdated? Nah, I'm classic, I'm timeless,\nYour fire bars are weak and they're rhymeless.\nI stay cold under pressure, that's mindless,\nWhile you're burning out, looking spineless.\nMy ice age reign is designed fineness,\nBow down to the king of the coldest highness.",
    duration: 44,
    rhyme_score: 8.0,
    flow_score: 8.0,
    punchlines_score: 7.5,
    delivery_score: 8.0,
    creativity_score: 7.5,
    rebuttal_score: 8.0,
    total_score: 39.7,
    judge_feedback: "Solid defense but struggled to match opponent's increased energy in the final round.",
    ai_model_used: 'gpt-4-turbo',
    created_at: new Date(Date.now() - 86400000 + 360000).toISOString()
  }
]

const SCORE_CATEGORIES = [
  { key: 'rhyme_score', label: 'Rhyme', weight: '20%' },
  { key: 'flow_score', label: 'Flow', weight: '25%' },
  { key: 'punchlines_score', label: 'Punchlines', weight: '20%' },
  { key: 'delivery_score', label: 'Delivery', weight: '15%' },
  { key: 'creativity_score', label: 'Creativity', weight: '10%' },
  { key: 'rebuttal_score', label: 'Rebuttal', weight: '10%' },
]

export default function BattleReplayPage() {
  const router = useRouter()
  const params = useParams()
  const battleId = params.id as string

  const { isDemo } = useUserStore()
  const [battle, setBattle] = useState<Battle | null>(null)
  const [rounds, setRounds] = useState<BattleRound[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set())
  const [activeRound, setActiveRound] = useState(1)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showClipModal, setShowClipModal] = useState(false)
  const [selectedClipRound, setSelectedClipRound] = useState<BattleRound | null>(null)
  const [clipCopied, setClipCopied] = useState(false)

  useEffect(() => {
    loadBattleData()
  }, [battleId])

  async function loadBattleData() {
    setLoading(true)

    if (isDemo || battleId.startsWith('demo')) {
      setBattle(DEMO_BATTLE)
      setRounds(DEMO_ROUNDS)
      setExpandedRounds(new Set(['r1p1', 'r1p2']))
    } else {
      const { battle: battleData, rounds: roundsData, votes: votesData } = await getBattleWithDetails(battleId)

      if (battleData) {
        setBattle(battleData)
        setRounds(roundsData)
        setVotes(votesData)
        // Expand first round by default
        if (roundsData.length > 0) {
          const firstRoundIds = roundsData
            .filter(r => r.round_number === 1)
            .map(r => r.id)
          setExpandedRounds(new Set(firstRoundIds))
        }
      } else {
        // Fall back to demo
        setBattle(DEMO_BATTLE)
        setRounds(DEMO_ROUNDS)
        setExpandedRounds(new Set(['r1p1', 'r1p2']))
      }
    }

    setLoading(false)
  }

  function toggleRoundExpanded(roundId: string) {
    setExpandedRounds(prev => {
      const next = new Set(prev)
      if (next.has(roundId)) {
        next.delete(roundId)
      } else {
        next.add(roundId)
      }
      return next
    })
  }

  function handleShare() {
    setShowShareModal(true)
  }

  function copyShareLink() {
    const url = `${window.location.origin}/battle/replay/${battleId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareToTwitter() {
    if (!battle) return
    const text = `Check out this epic rap battle between ${battle.player1?.username} vs ${battle.player2?.username}! 🎤🔥`
    const url = `${window.location.origin}/battle/replay/${battleId}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
  }

  function createClip(round: BattleRound) {
    setSelectedClipRound(round)
    setShowClipModal(true)
  }

  function copyClipText() {
    if (!selectedClipRound || !battle) return
    const player = selectedClipRound.player_id === battle.player1_id ? battle.player1 : battle.player2
    const clipText = `🎤 ${player?.username} dropped bars:\n\n"${selectedClipRound.transcript}"\n\n📊 Score: ${selectedClipRound.total_score?.toFixed(1)}/50\n🔗 Watch the full battle: ${window.location.origin}/battle/replay/${battleId}`
    navigator.clipboard.writeText(clipText)
    setClipCopied(true)
    setTimeout(() => setClipCopied(false), 2000)
  }

  function downloadTranscript() {
    if (!battle || rounds.length === 0) return

    let transcript = `RAP BATTLE TRANSCRIPT\n`
    transcript += `${'='.repeat(50)}\n\n`
    transcript += `${battle.player1?.username} vs ${battle.player2?.username}\n`
    transcript += `Date: ${formatDate(battle.completed_at || battle.created_at)}\n`
    transcript += `Winner: ${battle.winner_id === battle.player1_id ? battle.player1?.username : battle.player2?.username}\n`
    transcript += `Final Score: ${battle.player1_total_score?.toFixed(1)} - ${battle.player2_total_score?.toFixed(1)}\n\n`
    transcript += `${'='.repeat(50)}\n\n`

    const roundsByNumber = rounds.reduce((acc, round) => {
      if (!acc[round.round_number]) acc[round.round_number] = []
      acc[round.round_number].push(round)
      return acc
    }, {} as Record<number, BattleRound[]>)

    Object.entries(roundsByNumber).forEach(([roundNum, roundData]) => {
      transcript += `ROUND ${roundNum}\n`
      transcript += `${'-'.repeat(30)}\n\n`

      roundData.forEach(round => {
        const player = round.player_id === battle.player1_id ? battle.player1 : battle.player2
        transcript += `[${player?.username}] (Score: ${round.total_score?.toFixed(1)}/50)\n\n`
        transcript += `${round.transcript || 'No transcript available'}\n\n`
        if (round.judge_feedback) {
          transcript += `Judge: "${round.judge_feedback}"\n\n`
        }
        transcript += `\n`
      })
    })

    const blob = new Blob([transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `battle-${battleId}-transcript.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function playAudio(url: string, roundId: string) {
    if (playingAudio === roundId) {
      audioRef.current?.pause()
      setPlayingAudio(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(url)
      audio.onended = () => setPlayingAudio(null)
      audio.play()
      audioRef.current = audio
      setPlayingAudio(roundId)
    }
  }

  // Group rounds by round number
  const roundsByNumber = rounds.reduce((acc, round) => {
    if (!acc[round.round_number]) acc[round.round_number] = []
    acc[round.round_number].push(round)
    return acc
  }, {} as Record<number, BattleRound[]>)

  const totalRounds = Math.max(...Object.keys(roundsByNumber).map(Number), 0)

  // Calculate vote counts
  const player1Votes = votes.filter(v => v.voted_for_player_id === battle?.player1_id).length
  const player2Votes = votes.filter(v => v.voted_for_player_id === battle?.player2_id).length

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <Swords className="w-16 h-16 mx-auto mb-4 text-dark-600" />
          <h2 className="text-xl font-bold mb-2">Battle Not Found</h2>
          <p className="text-dark-400 mb-4">This battle doesn't exist or has been deleted.</p>
          <button onClick={() => router.push('/history')} className="btn-dark">
            Back to History
          </button>
        </div>
      </div>
    )
  }

  const winner = battle.winner_id === battle.player1_id ? battle.player1 : battle.player2

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-fire-900/10 via-dark-950 to-ice-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/history')}
            className="inline-flex items-center gap-2 text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadTranscript}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
              title="Download transcript"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Transcript</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* Battle Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="text-center mb-6">
            <span className="text-xs text-dark-400 uppercase tracking-wider">
              Battle Replay • {formatDate(battle.completed_at || battle.created_at)}
            </span>
          </div>

          {/* Players */}
          <div className="flex items-center justify-center gap-6 md:gap-12 mb-6">
            {/* Player 1 */}
            <div className="text-center">
              <div className="relative">
                <img
                  src={getAvatarUrl(battle.player1?.username || 'Unknown', battle.player1?.avatar_url)}
                  alt={battle.player1?.username || 'Player 1'}
                  className={cn(
                    "w-20 h-20 md:w-24 md:h-24 rounded-full border-4",
                    battle.winner_id === battle.player1_id
                      ? 'border-gold-500'
                      : 'border-dark-600'
                  )}
                />
                {battle.winner_id === battle.player1_id && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-black" />
                  </div>
                )}
              </div>
              <h3 className="font-bold mt-2">{battle.player1?.username || 'Player 1'}</h3>
              <p className="text-sm text-dark-400">{battle.player1?.elo_rating} ELO</p>
              <div className={cn(
                "text-2xl font-bold mt-1",
                battle.winner_id === battle.player1_id ? 'text-green-400' : 'text-red-400'
              )}>
                {battle.player1_total_score?.toFixed(1) || '0.0'}
              </div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="text-3xl font-bold text-dark-600">VS</div>
              <div className="text-xs text-dark-500 mt-1">{battle.total_rounds} rounds</div>
            </div>

            {/* Player 2 */}
            <div className="text-center">
              <div className="relative">
                <img
                  src={getAvatarUrl(battle.player2?.username || 'Unknown', battle.player2?.avatar_url)}
                  alt={battle.player2?.username || 'Player 2'}
                  className={cn(
                    "w-20 h-20 md:w-24 md:h-24 rounded-full border-4",
                    battle.winner_id === battle.player2_id
                      ? 'border-gold-500'
                      : 'border-dark-600'
                  )}
                />
                {battle.winner_id === battle.player2_id && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-black" />
                  </div>
                )}
              </div>
              <h3 className="font-bold mt-2">{battle.player2?.username || 'Player 2'}</h3>
              <p className="text-sm text-dark-400">{battle.player2?.elo_rating} ELO</p>
              <div className={cn(
                "text-2xl font-bold mt-1",
                battle.winner_id === battle.player2_id ? 'text-green-400' : 'text-red-400'
              )}>
                {battle.player2_total_score?.toFixed(1) || '0.0'}
              </div>
            </div>
          </div>

          {/* Spectator Votes */}
          {votes.length > 0 && (
            <div className="bg-dark-800 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-sm text-dark-400 mb-2">
                <Users className="w-4 h-4" />
                <span>Spectator Votes ({votes.length} total)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-right">
                  <span className="text-fire-400 font-bold">{player1Votes}</span>
                </div>
                <div className="flex-1 h-3 bg-dark-700 rounded-full overflow-hidden flex">
                  <div
                    className="bg-fire-500 h-full transition-all"
                    style={{ width: `${(player1Votes / (player1Votes + player2Votes || 1)) * 100}%` }}
                  />
                  <div
                    className="bg-ice-500 h-full transition-all"
                    style={{ width: `${(player2Votes / (player1Votes + player2Votes || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex-1">
                  <span className="text-ice-400 font-bold">{player2Votes}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Round Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((roundNum) => (
            <button
              key={roundNum}
              onClick={() => setActiveRound(roundNum)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap",
                activeRound === roundNum
                  ? 'bg-gold-500 text-black'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              )}
            >
              Round {roundNum}
            </button>
          ))}
        </div>

        {/* Round Content */}
        <div className="space-y-4">
          {roundsByNumber[activeRound]?.map((round) => {
            const isPlayer1 = round.player_id === battle.player1_id
            const player = isPlayer1 ? battle.player1 : battle.player2
            const isExpanded = expandedRounds.has(round.id)
            const isWinnerRound = round.total_score !== null &&
              roundsByNumber[activeRound]?.find(r => r.player_id !== round.player_id)?.total_score !== null &&
              round.total_score > (roundsByNumber[activeRound]?.find(r => r.player_id !== round.player_id)?.total_score || 0)

            return (
              <motion.div
                key={round.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "card overflow-hidden",
                  isPlayer1 ? 'border-l-4 border-l-fire-500' : 'border-l-4 border-l-ice-500'
                )}
              >
                {/* Round Header */}
                <button
                  onClick={() => toggleRoundExpanded(round.id)}
                  className="w-full flex items-center gap-4 text-left"
                >
                  <img
                    src={getAvatarUrl(player?.username || 'Unknown', player?.avatar_url)}
                    alt={player?.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{player?.username}</h3>
                      {isWinnerRound && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          Won Round
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-dark-400">
                      {round.duration ? `${round.duration}s` : 'No duration'} • Score: {round.total_score?.toFixed(1) || 'N/A'}
                    </p>
                  </div>

                  {/* Clip Button */}
                  {round.transcript && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        createClip(round)
                      }}
                      className="p-2 rounded-lg bg-dark-700 hover:bg-purple-500/20 transition-colors"
                      title="Create clip"
                    >
                      <Scissors className="w-5 h-5 text-purple-400" />
                    </button>
                  )}

                  {/* Audio Play Button */}
                  {round.audio_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        playAudio(round.audio_url!, round.id)
                      }}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        playingAudio === round.id
                          ? 'bg-gold-500 text-black'
                          : 'bg-dark-700 hover:bg-dark-600'
                      )}
                    >
                      {playingAudio === round.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                  )}

                  <div className="p-2">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-dark-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-dark-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-dark-700">
                        {/* Transcript */}
                        {round.transcript && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-dark-400 mb-2 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              Lyrics
                            </h4>
                            <div className="bg-dark-800 rounded-xl p-4 font-mono text-sm whitespace-pre-wrap">
                              {round.transcript}
                            </div>
                          </div>
                        )}

                        {/* Scores */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-dark-400 mb-2 flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            Scores
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {SCORE_CATEGORIES.map((category) => {
                              const score = round[category.key as keyof BattleRound] as number | null
                              return (
                                <div key={category.key} className="bg-dark-800 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-dark-400">{category.label}</span>
                                    <span className="text-xs text-dark-500">{category.weight}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full transition-all",
                                          isPlayer1 ? 'bg-fire-500' : 'bg-ice-500'
                                        )}
                                        style={{ width: `${((score || 0) / 10) * 100}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-sm w-8 text-right">
                                      {score?.toFixed(1) || '-'}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Judge Feedback */}
                        {round.judge_feedback && (
                          <div>
                            <h4 className="text-sm font-medium text-dark-400 mb-2 flex items-center gap-2">
                              <Mic className="w-4 h-4" />
                              Judge's Feedback
                            </h4>
                            <div className="bg-gradient-to-r from-gold-500/10 to-gold-600/5 rounded-xl p-4 border border-gold-500/20">
                              <p className="text-sm italic">"{round.judge_feedback}"</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Winner Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mt-6 bg-gradient-to-r from-gold-500/10 to-gold-600/5 border-gold-500/30"
        >
          <div className="flex items-center justify-center gap-4">
            <Trophy className="w-8 h-8 text-gold-400" />
            <div className="text-center">
              <p className="text-dark-400 text-sm">Winner</p>
              <h3 className="text-xl font-bold text-gold-400">{winner?.username}</h3>
              <p className="text-sm text-dark-400">
                Final Score: {battle.winner_id === battle.player1_id
                  ? battle.player1_total_score?.toFixed(1)
                  : battle.player2_total_score?.toFixed(1)
                }
              </p>
            </div>
            <img
              src={getAvatarUrl(winner?.username || '', winner?.avatar_url)}
              alt={winner?.username}
              className="w-16 h-16 rounded-full border-2 border-gold-500"
            />
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => winner && router.push(`/profile/${winner.id}`)}
            className="flex-1 btn-dark flex items-center justify-center gap-2"
          >
            View Winner's Profile
          </button>
          <button
            onClick={() => router.push('/battle/create')}
            className="flex-1 btn-fire flex items-center justify-center gap-2"
          >
            <Swords className="w-5 h-5" />
            Start New Battle
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-900 rounded-2xl p-6 max-w-sm w-full border border-dark-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Share Battle</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-dark-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={copyShareLink}
                  className="w-full flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Link className="w-5 h-5 text-purple-400" />
                  )}
                  <span className="flex-1 text-left">
                    {copied ? 'Link Copied!' : 'Copy Link'}
                  </span>
                </button>

                <button
                  onClick={shareToTwitter}
                  className="w-full flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors"
                >
                  <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                  <span className="flex-1 text-left">Share to Twitter</span>
                </button>

                <button
                  onClick={downloadTranscript}
                  className="w-full flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors"
                >
                  <Download className="w-5 h-5 text-ice-400" />
                  <span className="flex-1 text-left">Download Transcript</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clip Modal */}
      <AnimatePresence>
        {showClipModal && selectedClipRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowClipModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-900 rounded-2xl p-6 max-w-md w-full border border-dark-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-purple-400" />
                  Create Clip
                </h3>
                <button
                  onClick={() => setShowClipModal(false)}
                  className="p-2 hover:bg-dark-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Preview */}
                <div className="bg-dark-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={getAvatarUrl(
                        selectedClipRound.player_id === battle?.player1_id
                          ? battle?.player1?.username || ''
                          : battle?.player2?.username || '',
                        selectedClipRound.player_id === battle?.player1_id
                          ? battle?.player1?.avatar_url
                          : battle?.player2?.avatar_url
                      )}
                      alt="Player"
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-semibold">
                        {selectedClipRound.player_id === battle?.player1_id
                          ? battle?.player1?.username
                          : battle?.player2?.username}
                      </p>
                      <p className="text-xs text-dark-400">Round {selectedClipRound.round_number}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-gold-400 font-bold">{selectedClipRound.total_score?.toFixed(1)}</p>
                      <p className="text-xs text-dark-400">Score</p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-300 line-clamp-4 font-mono">
                    "{selectedClipRound.transcript}"
                  </p>
                </div>

                {/* Actions */}
                <button
                  onClick={copyClipText}
                  className="w-full btn-purple flex items-center justify-center gap-2"
                >
                  {clipCopied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy Clip Text
                    </>
                  )}
                </button>

                <p className="text-xs text-dark-500 text-center">
                  Share this clip on social media or messaging apps
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
