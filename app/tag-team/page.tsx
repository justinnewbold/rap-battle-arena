'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Users, Swords, Trophy, Plus, UserPlus, Zap, Shield } from 'lucide-react'

interface Team {
  id: string
  name: string
  tag: string
  wins: number
  losses: number
  rating: number
  members: Array<{
    user_id: string
    username: string
    avatar_url: string
    role: 'leader' | 'member'
  }>
}

interface TagTeamBattle {
  id: string
  status: 'waiting' | 'in_progress' | 'completed'
  team1: Team
  team2: Team | null
  prize_pool: number
  created_at: string
}

export default function TagTeamPage() {
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [openBattles, setOpenBattles] = useState<TagTeamBattle[]>([])
  const [topTeams, setTopTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTagTeamData()
  }, [])

  const loadTagTeamData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: teamMembership } = await supabase
          .from('team_members')
          .select('team:teams(*)')
          .eq('user_id', user.id)
          .single()

        if (teamMembership?.team) {
          setMyTeam(teamMembership.team as unknown as Team)
        }
      }

      const { data: battles } = await supabase
        .from('tag_team_battles')
        .select('*, team1:teams!team1_id(*), team2:teams!team2_id(*)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })

      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .order('rating', { ascending: false })
        .limit(10)

      setOpenBattles(battles || [])
      setTopTeams(teams || [])
    } catch (error) {
      console.error('Failed to load tag team data:', error)
    }
    setLoading(false)
  }

  const createTeam = async () => {
    // Open team creation modal
  }

  const challengeTeam = async (teamId: string) => {
    if (!myTeam) return

    await supabase.from('tag_team_battles').insert({
      team1_id: myTeam.id,
      team2_id: teamId,
      status: 'waiting',
      created_at: new Date().toISOString()
    })

    loadTagTeamData()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Users className="h-10 w-10 text-blue-500" />
            Tag Team Battles
          </h1>
          <p className="text-dark-400 mt-2">
            Team up with a partner and dominate together. 2v2 battles.
          </p>
        </div>
        {!myTeam ? (
          <Button size="lg" onClick={createTeam}>
            <Plus className="h-5 w-5 mr-2" />
            Create Team
          </Button>
        ) : (
          <Button size="lg">
            <Swords className="h-5 w-5 mr-2" />
            Find Match
          </Button>
        )}
      </div>

      {/* My Team Card */}
      {myTeam ? (
        <Card variant="bordered" className="mb-8 border-fire-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-fire-500" />
                  {myTeam.name}
                  <span className="px-2 py-1 rounded text-xs border border-dark-500">[{myTeam.tag}]</span>
                </CardTitle>
                <CardDescription>Your Team</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{myTeam.rating}</p>
                <p className="text-sm text-dark-400">Team Rating</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {myTeam.members?.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-dark-600 flex items-center justify-center text-lg font-bold">
                      {member.username[0]}
                    </div>
                    <div>
                      <p className="font-medium">{member.username}</p>
                      <p className="text-xs text-dark-400 capitalize">{member.role}</p>
                    </div>
                  </div>
                ))}
                {(myTeam.members?.length || 0) < 2 && (
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Invite Partner
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-500">{myTeam.wins}</p>
                  <p className="text-xs text-dark-400">Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-500">{myTeam.losses}</p>
                  <p className="text-xs text-dark-400">Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">
                    {myTeam.wins + myTeam.losses > 0
                      ? Math.round((myTeam.wins / (myTeam.wins + myTeam.losses)) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-dark-400">Win Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 border-dashed border-dark-600">
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-dark-400" />
            <h3 className="text-lg font-semibold mb-2">You're not on a team yet</h3>
            <p className="text-dark-400 mb-4">
              Create a team or get invited by another player to start tag team battles.
            </p>
            <Button onClick={createTeam}>Create Your Team</Button>
          </CardContent>
        </Card>
      )}

      {/* Open Battles */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Open Challenges
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openBattles.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-dark-400">
                No open tag team challenges. Challenge a team from the leaderboard!
              </CardContent>
            </Card>
          ) : (
            openBattles.map((battle) => (
              <Card key={battle.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {battle.team1.members?.slice(0, 2).map((member) => (
                          <div key={member.user_id} className="h-8 w-8 rounded-full bg-dark-600 border-2 border-dark-800 flex items-center justify-center text-sm font-bold">
                            {member.username[0]}
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="font-semibold">{battle.team1.name}</p>
                        <p className="text-sm text-dark-400">
                          Rating: {battle.team1.rating}
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="px-2 py-1 rounded text-xs border border-dark-500">VS</span>
                      {battle.prize_pool > 0 && (
                        <p className="text-xs text-yellow-500 mt-1">
                          {battle.prize_pool} coins
                        </p>
                      )}
                    </div>
                    <div>
                      {myTeam && myTeam.id !== battle.team1.id ? (
                        <Button onClick={() => challengeTeam(battle.team1.id)}>
                          Accept Challenge
                        </Button>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-dark-700">Waiting...</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Top Teams Leaderboard */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Top Teams
        </h2>
        <Card>
          <CardContent>
            <div className="space-y-4">
              {topTeams.map((team, index) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold
                      ${index === 0 ? 'bg-yellow-500 text-yellow-950' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-950' :
                        'bg-dark-600 text-dark-300'}`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {team.name}
                        <span className="px-2 py-0.5 rounded text-xs border border-dark-500">[{team.tag}]</span>
                      </p>
                      <p className="text-sm text-dark-400">
                        {team.wins}W - {team.losses}L
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{team.rating}</p>
                      <p className="text-xs text-dark-400">Rating</p>
                    </div>
                    {myTeam && myTeam.id !== team.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => challengeTeam(team.id)}
                      >
                        Challenge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {topTeams.length === 0 && (
                <p className="text-center text-dark-400 py-4">
                  No teams registered yet. Be the first!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Synergy Explanation */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Team Synergy System</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <Zap className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-2">Build Synergy</h3>
              <p className="text-sm text-dark-400">
                Win battles together to increase your team synergy bonus. Higher synergy means better coordination bonuses.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">Tag Mechanics</h3>
              <p className="text-sm text-dark-400">
                Take turns delivering verses. Time your tags perfectly to build momentum and catch opponents off guard.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                <Trophy className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-2">Team Achievements</h3>
              <p className="text-sm text-dark-400">
                Unlock exclusive team achievements and cosmetics. Dominate the tag team leaderboards together.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
