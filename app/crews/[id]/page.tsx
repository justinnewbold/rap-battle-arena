'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, Crown, Shield, Trophy, Swords,
  Calendar, ChevronRight
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Crew, CrewMember, CrewBattle,
  getCrew, getCrewMembers, getCrewBattles
} from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'

// Demo data
const DEMO_CREW: Crew = {
  id: 'c1',
  name: 'Mic Droppers',
  tag: 'MIC',
  description: 'Elite squad of lyrical assassins. We came to dominate the arena and take no prisoners. Join us if you got bars.',
  avatar_url: null,
  banner_url: null,
  leader_id: 'u1',
  total_wins: 45,
  total_losses: 12,
  elo_rating: 1850,
  created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
  updated_at: new Date().toISOString(),
  leader: { id: 'u1', username: 'MC_Thunder', avatar_url: null, elo_rating: 1650, wins: 34, losses: 12, total_battles: 46, created_at: '', updated_at: '' }
}

const DEMO_MEMBERS: CrewMember[] = [
  { id: 'm1', crew_id: 'c1', user_id: 'u1', role: 'leader', joined_at: new Date(Date.now() - 86400000 * 60).toISOString(), user: { id: 'u1', username: 'MC_Thunder', avatar_url: null, elo_rating: 1650, wins: 34, losses: 12, total_battles: 46, created_at: '', updated_at: '' } },
  { id: 'm2', crew_id: 'c1', user_id: 'u4', role: 'co_leader', joined_at: new Date(Date.now() - 86400000 * 45).toISOString(), user: { id: 'u4', username: 'BeatMaster', avatar_url: null, elo_rating: 1480, wins: 25, losses: 20, total_battles: 45, created_at: '', updated_at: '' } },
  { id: 'm3', crew_id: 'c1', user_id: 'u5', role: 'member', joined_at: new Date(Date.now() - 86400000 * 30).toISOString(), user: { id: 'u5', username: 'RhymeTime', avatar_url: null, elo_rating: 1320, wins: 18, losses: 15, total_battles: 33, created_at: '', updated_at: '' } },
  { id: 'm4', crew_id: 'c1', user_id: 'u6', role: 'member', joined_at: new Date(Date.now() - 86400000 * 15).toISOString(), user: { id: 'u6', username: 'LilVerse', avatar_url: null, elo_rating: 1280, wins: 15, losses: 12, total_battles: 27, created_at: '', updated_at: '' } },
  { id: 'm5', crew_id: 'c1', user_id: 'u7', role: 'member', joined_at: new Date(Date.now() - 86400000 * 5).toISOString(), user: { id: 'u7', username: 'WordSmith', avatar_url: null, elo_rating: 1150, wins: 10, losses: 8, total_battles: 18, created_at: '', updated_at: '' } },
]

const DEMO_BATTLES: CrewBattle[] = [
  {
    id: 'cb1',
    crew1_id: 'c1',
    crew2_id: 'c2',
    status: 'complete',
    winner_crew_id: 'c1',
    crew1_score: 3,
    crew2_score: 1,
    best_of: 5,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    crew2: { id: 'c2', name: 'Flow State', tag: 'FLO' } as Crew
  },
  {
    id: 'cb2',
    crew1_id: 'c3',
    crew2_id: 'c1',
    status: 'complete',
    winner_crew_id: 'c1',
    crew1_score: 1,
    crew2_score: 3,
    best_of: 5,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    crew1: { id: 'c3', name: 'Bar Raisers', tag: 'BAR' } as Crew
  },
]

function getRoleIcon(role: string) {
  switch (role) {
    case 'leader':
      return <Crown className="w-4 h-4 text-gold-400" />
    case 'co_leader':
      return <Shield className="w-4 h-4 text-purple-400" />
    default:
      return null
  }
}

function getRoleName(role: string) {
  switch (role) {
    case 'leader': return 'Leader'
    case 'co_leader': return 'Co-Leader'
    default: return 'Member'
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CrewDetailPage() {
  const router = useRouter()
  const params = useParams()
  const crewId = params.id as string
  const { user, isDemo } = useUserStore()
  const sounds = useSounds()

  const [crew, setCrew] = useState<Crew | null>(null)
  const [members, setMembers] = useState<CrewMember[]>([])
  const [battles, setBattles] = useState<CrewBattle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'battles'>('members')

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadCrewData()
  }, [user, router, crewId])

  async function loadCrewData() {
    setLoading(true)
    if (isDemo) {
      setCrew(DEMO_CREW)
      setMembers(DEMO_MEMBERS)
      setBattles(DEMO_BATTLES)
    } else {
      const [crewData, membersData, battlesData] = await Promise.all([
        getCrew(crewId),
        getCrewMembers(crewId),
        getCrewBattles(crewId)
      ])
      setCrew(crewData)
      setMembers(membersData)
      setBattles(battlesData)
    }
    setLoading(false)
  }

  function handleChallenge() {
    sounds.play('button_click')
    // Would open challenge modal
    alert('Crew challenge feature coming soon!')
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!crew) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center">
        <Users className="w-16 h-16 mb-4 text-dark-600" />
        <h2 className="text-xl font-bold mb-2">Crew Not Found</h2>
        <p className="text-dark-400 mb-4">This crew doesn't exist or has been disbanded.</p>
        <button onClick={() => router.push('/crews')} className="btn-dark">
          Back to Crews
        </button>
      </div>
    )
  }

  const winRate = crew.total_wins + crew.total_losses > 0
    ? Math.round((crew.total_wins / (crew.total_wins + crew.total_losses)) * 100)
    : 0

  const avgElo = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + (m.user?.elo_rating || 0), 0) / members.length)
    : 0

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-dark-950 to-fire-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/crews')}
            className="text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Crew Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Crew Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-fire-500 rounded-2xl flex items-center justify-center text-4xl font-bold shrink-0">
              [{crew.tag}]
            </div>

            {/* Crew Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{crew.name}</h1>
              {crew.description && (
                <p className="text-dark-400 mb-4">{crew.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-dark-500" />
                  <span className="text-dark-400">Founded {formatDate(crew.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-dark-500" />
                  <span className="text-dark-400">{members.length} members</span>
                </div>
              </div>
            </div>

            {/* Challenge Button */}
            <button
              onClick={handleChallenge}
              className="btn-fire flex items-center gap-2"
            >
              <Swords className="w-5 h-5" />
              Challenge
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-dark-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{crew.elo_rating}</div>
              <div className="text-sm text-dark-400">Crew ELO</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                <span className="text-green-400">{crew.total_wins}</span>
                <span className="text-dark-500 mx-1">-</span>
                <span className="text-fire-400">{crew.total_losses}</span>
              </div>
              <div className="text-sm text-dark-400">Record</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gold-400">{winRate}%</div>
              <div className="text-sm text-dark-400">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ice-400">{avgElo}</div>
              <div className="text-sm text-dark-400">Avg Member ELO</div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors flex items-center gap-2",
              activeTab === 'members'
                ? "bg-purple-500 text-white"
                : "bg-dark-800 text-dark-400 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('battles')}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors flex items-center gap-2",
              activeTab === 'battles'
                ? "bg-purple-500 text-white"
                : "bg-dark-800 text-dark-400 hover:text-white"
            )}
          >
            <Swords className="w-4 h-4" />
            Battles ({battles.length})
          </button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/profile/${member.user_id}`)}
                className="card py-3 flex items-center gap-4 cursor-pointer hover:border-dark-600 transition-colors"
              >
                <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center font-bold">
                  {member.user?.username?.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{member.user?.username}</span>
                    {getRoleIcon(member.role)}
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      member.role === 'leader' ? "bg-gold-500/20 text-gold-400" :
                      member.role === 'co_leader' ? "bg-purple-500/20 text-purple-400" :
                      "bg-dark-700 text-dark-400"
                    )}>
                      {getRoleName(member.role)}
                    </span>
                  </div>
                  <div className="text-sm text-dark-400">
                    {member.user?.elo_rating} ELO • {member.user?.wins}W - {member.user?.losses}L
                  </div>
                </div>

                <div className="text-right text-sm text-dark-500">
                  Joined {formatDate(member.joined_at)}
                </div>

                <ChevronRight className="w-5 h-5 text-dark-500" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Battles Tab */}
        {activeTab === 'battles' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {battles.length > 0 ? battles.map((battle, index) => {
              const isCrewOne = battle.crew1_id === crewId
              const opponent = isCrewOne ? battle.crew2 : battle.crew1
              const won = battle.winner_crew_id === crewId
              const ourScore = isCrewOne ? battle.crew1_score : battle.crew2_score
              const theirScore = isCrewOne ? battle.crew2_score : battle.crew1_score

              return (
                <motion.div
                  key={battle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "card flex items-center gap-4",
                    won ? "border-green-500/30" : "border-fire-500/30"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    won ? "bg-green-500/20" : "bg-fire-500/20"
                  )}>
                    {won ? <Trophy className="w-6 h-6 text-green-400" /> : <Swords className="w-6 h-6 text-fire-400" />}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold">
                      vs [{opponent?.tag}] {opponent?.name}
                    </div>
                    <div className="text-sm text-dark-400">
                      Best of {battle.best_of} • {formatDate(battle.completed_at || battle.created_at)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={cn(
                      "text-lg font-bold",
                      won ? "text-green-400" : "text-fire-400"
                    )}>
                      {won ? 'WIN' : 'LOSS'}
                    </div>
                    <div className="text-sm text-dark-400">
                      {ourScore} - {theirScore}
                    </div>
                  </div>
                </motion.div>
              )
            }) : (
              <div className="card text-center py-12">
                <Swords className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                <h3 className="text-xl font-bold mb-2">No Crew Battles Yet</h3>
                <p className="text-dark-400">This crew hasn't participated in any battles.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
