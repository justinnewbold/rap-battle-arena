'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Crown, Shield, Search, Plus, ArrowLeft, Swords,
  Trophy, Star, ChevronRight, UserPlus, LogOut, Settings,
  Mail, Check, X
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Crew, CrewMember, CrewInvite, Profile,
  getCrews, getUserCrewMembership, getCrewMembers,
  getPendingCrewInvites, searchCrews, acceptCrewInvite,
  declineCrewInvite, leaveCrew, getCrewBattles, CrewBattle
} from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSounds } from '@/lib/sounds'

// Demo data
const DEMO_CREWS: Crew[] = [
  {
    id: 'c1',
    name: 'Mic Droppers',
    tag: 'MIC',
    description: 'Elite squad of lyrical assassins',
    avatar_url: null,
    banner_url: null,
    leader_id: 'u1',
    total_wins: 45,
    total_losses: 12,
    elo_rating: 1850,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    leader: { id: 'u1', username: 'MC_Thunder', avatar_url: null, elo_rating: 1650, wins: 34, losses: 12, total_battles: 46, created_at: '', updated_at: '' }
  },
  {
    id: 'c2',
    name: 'Flow State',
    tag: 'FLO',
    description: 'Smooth flows, hard bars',
    avatar_url: null,
    banner_url: null,
    leader_id: 'u2',
    total_wins: 38,
    total_losses: 15,
    elo_rating: 1720,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    leader: { id: 'u2', username: 'LyricQueen', avatar_url: null, elo_rating: 1580, wins: 28, losses: 14, total_battles: 42, created_at: '', updated_at: '' }
  },
  {
    id: 'c3',
    name: 'Bar Raisers',
    tag: 'BAR',
    description: 'We raise the bar every time',
    avatar_url: null,
    banner_url: null,
    leader_id: 'u3',
    total_wins: 32,
    total_losses: 18,
    elo_rating: 1620,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    leader: { id: 'u3', username: 'FlowKing', avatar_url: null, elo_rating: 1520, wins: 22, losses: 16, total_battles: 38, created_at: '', updated_at: '' }
  },
]

const DEMO_CREW_MEMBERS: CrewMember[] = [
  { id: 'm1', crew_id: 'c1', user_id: 'demo', role: 'member', joined_at: new Date().toISOString(), user: { id: 'demo', username: 'DemoRapper', avatar_url: null, elo_rating: 1000, wins: 5, losses: 3, total_battles: 8, created_at: '', updated_at: '' } },
  { id: 'm2', crew_id: 'c1', user_id: 'u1', role: 'leader', joined_at: new Date().toISOString(), user: { id: 'u1', username: 'MC_Thunder', avatar_url: null, elo_rating: 1650, wins: 34, losses: 12, total_battles: 46, created_at: '', updated_at: '' } },
  { id: 'm3', crew_id: 'c1', user_id: 'u4', role: 'co_leader', joined_at: new Date().toISOString(), user: { id: 'u4', username: 'BeatMaster', avatar_url: null, elo_rating: 1480, wins: 25, losses: 20, total_battles: 45, created_at: '', updated_at: '' } },
  { id: 'm4', crew_id: 'c1', user_id: 'u5', role: 'member', joined_at: new Date().toISOString(), user: { id: 'u5', username: 'RhymeTime', avatar_url: null, elo_rating: 1320, wins: 18, losses: 15, total_battles: 33, created_at: '', updated_at: '' } },
]

const DEMO_INVITES: CrewInvite[] = [
  {
    id: 'i1',
    crew_id: 'c2',
    user_id: 'demo',
    invited_by: 'u2',
    status: 'pending',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    crew: { id: 'c2', name: 'Flow State', tag: 'FLO', avatar_url: null } as Crew,
    inviter: { id: 'u2', username: 'LyricQueen', avatar_url: null, elo_rating: 1580, wins: 28, losses: 14, total_battles: 42, created_at: '', updated_at: '' }
  }
]

type TabType = 'browse' | 'my_crew' | 'invites'

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
    case 'leader':
      return 'Leader'
    case 'co_leader':
      return 'Co-Leader'
    default:
      return 'Member'
  }
}

export default function CrewsPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const sounds = useSounds()

  const [tab, setTab] = useState<TabType>('browse')
  const [crews, setCrews] = useState<Crew[]>([])
  const [myCrew, setMyCrew] = useState<Crew | null>(null)
  const [myMembership, setMyMembership] = useState<CrewMember | null>(null)
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [invites, setInvites] = useState<CrewInvite[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

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
      setCrews(DEMO_CREWS)
      // Demo user is in Mic Droppers
      setMyCrew(DEMO_CREWS[0])
      setMyMembership(DEMO_CREW_MEMBERS[0])
      setCrewMembers(DEMO_CREW_MEMBERS)
      setInvites(DEMO_INVITES)
    } else {
      const [crewsData, membership, invitesData] = await Promise.all([
        getCrews(),
        getUserCrewMembership(user!.id),
        getPendingCrewInvites(user!.id)
      ])
      setCrews(crewsData)
      setInvites(invitesData)

      if (membership) {
        setMyMembership(membership)
        setMyCrew(membership.crew as Crew)
        const members = await getCrewMembers(membership.crew_id)
        setCrewMembers(members)
      }
    }
    setLoading(false)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadData()
      return
    }
    if (isDemo) {
      const filtered = DEMO_CREWS.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setCrews(filtered)
    } else {
      const results = await searchCrews(searchQuery)
      setCrews(results)
    }
  }

  async function handleAcceptInvite(inviteId: string) {
    sounds.play('notification')
    if (isDemo) {
      setInvites(prev => prev.filter(i => i.id !== inviteId))
      // In demo, join Flow State
      setMyCrew(DEMO_CREWS[1])
      setTab('my_crew')
      return
    }
    const success = await acceptCrewInvite(inviteId, user!.id)
    if (success) {
      loadData()
      setTab('my_crew')
    }
  }

  async function handleDeclineInvite(inviteId: string) {
    sounds.play('button_click')
    if (isDemo) {
      setInvites(prev => prev.filter(i => i.id !== inviteId))
      return
    }
    await declineCrewInvite(inviteId)
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  async function handleLeaveCrew() {
    if (!myCrew || !confirm('Are you sure you want to leave this crew?')) return
    sounds.play('button_click')
    if (isDemo) {
      setMyCrew(null)
      setMyMembership(null)
      setCrewMembers([])
      setTab('browse')
      return
    }
    const success = await leaveCrew(myCrew.id, user!.id)
    if (success) {
      setMyCrew(null)
      setMyMembership(null)
      setCrewMembers([])
      setTab('browse')
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-dark-950 to-fire-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              Crews
            </h1>
            <p className="text-dark-400 mt-1">Team up and dominate</p>
          </div>
          {!myCrew && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-fire flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Crew
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab('browse'); sounds.play('button_click') }}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors",
              tab === 'browse'
                ? "bg-purple-500 text-white"
                : "bg-dark-800 text-dark-400 hover:text-white"
            )}
          >
            Browse Crews
          </button>
          <button
            onClick={() => { setTab('my_crew'); sounds.play('button_click') }}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors",
              tab === 'my_crew'
                ? "bg-purple-500 text-white"
                : "bg-dark-800 text-dark-400 hover:text-white"
            )}
          >
            My Crew
          </button>
          <button
            onClick={() => { setTab('invites'); sounds.play('button_click') }}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors relative",
              tab === 'invites'
                ? "bg-purple-500 text-white"
                : "bg-dark-800 text-dark-400 hover:text-white"
            )}
          >
            Invites
            {invites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-fire-500 rounded-full text-xs flex items-center justify-center">
                {invites.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Browse Crews Tab */}
            {tab === 'browse' && (
              <motion.div
                key="browse"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Search */}
                <div className="flex gap-2 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search crews by name or tag..."
                      className="input pl-12"
                    />
                  </div>
                  <button onClick={handleSearch} className="btn-dark">
                    Search
                  </button>
                </div>

                {/* Crew List */}
                <div className="space-y-3">
                  {crews.map((crew, index) => (
                    <motion.div
                      key={crew.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => router.push(`/crews/${crew.id}`)}
                      className="card flex items-center gap-4 cursor-pointer hover:border-dark-600 transition-colors"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-fire-500 rounded-xl flex items-center justify-center text-2xl font-bold">
                        [{crew.tag}]
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg">{crew.name}</h3>
                        <p className="text-sm text-dark-400 truncate">{crew.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="text-purple-400">
                            <Trophy className="w-4 h-4 inline mr-1" />
                            {crew.elo_rating} ELO
                          </span>
                          <span className="text-green-400">
                            {crew.total_wins}W
                          </span>
                          <span className="text-fire-400">
                            {crew.total_losses}L
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-dark-400">Leader</div>
                        <div className="font-medium">{crew.leader?.username}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-dark-500" />
                    </motion.div>
                  ))}

                  {crews.length === 0 && (
                    <div className="card text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                      <h3 className="text-xl font-bold mb-2">No Crews Found</h3>
                      <p className="text-dark-400">Be the first to create a crew!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* My Crew Tab */}
            {tab === 'my_crew' && (
              <motion.div
                key="my_crew"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {myCrew ? (
                  <div className="space-y-6">
                    {/* Crew Header */}
                    <div className="card">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-fire-500 rounded-xl flex items-center justify-center text-3xl font-bold">
                          [{myCrew.tag}]
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold">{myCrew.name}</h2>
                          <p className="text-dark-400 mt-1">{myCrew.description}</p>
                          <div className="flex items-center gap-6 mt-3">
                            <div>
                              <div className="text-sm text-dark-400">ELO Rating</div>
                              <div className="text-xl font-bold text-purple-400">{myCrew.elo_rating}</div>
                            </div>
                            <div>
                              <div className="text-sm text-dark-400">Record</div>
                              <div className="text-xl font-bold">
                                <span className="text-green-400">{myCrew.total_wins}W</span>
                                {' - '}
                                <span className="text-fire-400">{myCrew.total_losses}L</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-dark-400">Your Role</div>
                              <div className="flex items-center gap-1 text-lg font-bold">
                                {getRoleIcon(myMembership?.role || 'member')}
                                {getRoleName(myMembership?.role || 'member')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-dark-700">
                        {(myMembership?.role === 'leader' || myMembership?.role === 'co_leader') && (
                          <>
                            <button className="btn-dark flex items-center gap-2">
                              <UserPlus className="w-4 h-4" />
                              Invite Members
                            </button>
                            <button className="btn-dark flex items-center gap-2">
                              <Settings className="w-4 h-4" />
                              Manage Crew
                            </button>
                          </>
                        )}
                        <button className="btn-fire flex items-center gap-2">
                          <Swords className="w-4 h-4" />
                          Challenge Crew
                        </button>
                        {myMembership?.role !== 'leader' && (
                          <button
                            onClick={handleLeaveCrew}
                            className="btn-dark flex items-center gap-2 text-fire-400 hover:text-fire-300"
                          >
                            <LogOut className="w-4 h-4" />
                            Leave Crew
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Members */}
                    <div>
                      <h3 className="text-xl font-bold mb-4">Members ({crewMembers.length})</h3>
                      <div className="space-y-2">
                        {crewMembers.map((member) => (
                          <div
                            key={member.id}
                            onClick={() => router.push(`/profile/${member.user_id}`)}
                            className="card py-3 flex items-center gap-3 cursor-pointer hover:border-dark-600 transition-colors"
                          >
                            <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center text-sm font-bold">
                              {member.user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium flex items-center gap-2">
                                {member.user?.username}
                                {getRoleIcon(member.role)}
                              </div>
                              <div className="text-sm text-dark-400">
                                {member.user?.elo_rating} ELO • {member.user?.wins}W - {member.user?.losses}L
                              </div>
                            </div>
                            <span className="text-xs text-dark-500 px-2 py-1 bg-dark-700 rounded">
                              {getRoleName(member.role)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                    <h3 className="text-xl font-bold mb-2">No Crew Yet</h3>
                    <p className="text-dark-400 mb-6">Join an existing crew or create your own!</p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setTab('browse')}
                        className="btn-dark"
                      >
                        Browse Crews
                      </button>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-fire flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Create Crew
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Invites Tab */}
            {tab === 'invites' && (
              <motion.div
                key="invites"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {invites.length > 0 ? (
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="card flex items-center gap-4"
                      >
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-fire-500 rounded-xl flex items-center justify-center text-xl font-bold">
                          [{invite.crew?.tag}]
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold">{invite.crew?.name}</h3>
                          <p className="text-sm text-dark-400">
                            Invited by {invite.inviter?.username}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(invite.id)}
                            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeclineInvite(invite.id)}
                            className="p-2 bg-fire-500/20 text-fire-400 rounded-lg hover:bg-fire-500/30"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card text-center py-12">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                    <h3 className="text-xl font-bold mb-2">No Pending Invites</h3>
                    <p className="text-dark-400">You don't have any crew invites</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Create Crew Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCrewModal
            onClose={() => setShowCreateModal(false)}
            onCreate={() => {
              setShowCreateModal(false)
              loadData()
              setTab('my_crew')
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateCrewModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const { user, isDemo } = useUserStore()
  const sounds = useSounds()
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim() || !tag.trim()) {
      setError('Name and tag are required')
      return
    }
    if (tag.length < 2 || tag.length > 4) {
      setError('Tag must be 2-4 characters')
      return
    }

    setLoading(true)
    sounds.play('notification')

    if (isDemo) {
      // Simulate creation in demo mode
      setTimeout(() => {
        onCreate()
      }, 500)
      return
    }

    // In real mode, would call createCrew
    onCreate()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Users className="w-7 h-7 text-purple-400" />
          Create Crew
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-dark-400 mb-2">Crew Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mic Droppers"
              className="input"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm text-dark-400 mb-2">Tag (2-4 characters)</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="e.g. MIC"
              className="input font-mono"
              maxLength={4}
            />
            <p className="text-xs text-dark-500 mt-1">
              Will appear as [{tag || 'TAG'}] before members' names
            </p>
          </div>

          <div>
            <label className="block text-sm text-dark-400 mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people about your crew..."
              className="input resize-none h-24"
              maxLength={200}
            />
          </div>

          {error && (
            <p className="text-fire-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 btn-dark">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 btn-fire"
            >
              {loading ? 'Creating...' : 'Create Crew'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
