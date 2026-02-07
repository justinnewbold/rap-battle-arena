'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Swords, Users, Trophy, Clock, Crown, Skull, Zap } from 'lucide-react'

interface BattleRoyale {
  id: string
  name: string
  status: 'waiting' | 'in_progress' | 'completed'
  max_participants: number
  current_round: number
  total_rounds: number
  prize_pool: number
  entry_fee: number
  started_at: string | null
  participants: Array<{
    user_id: string
    username: string
    avatar_url: string
    eliminated: boolean
    placement: number | null
  }>
}

export default function BattleRoyalePage() {
  const [activeRoyales, setActiveRoyales] = useState<BattleRoyale[]>([])
  const [upcomingRoyales, setUpcomingRoyales] = useState<BattleRoyale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBattleRoyales()
  }, [])

  const loadBattleRoyales = async () => {
    setLoading(true)
    try {
      const { data: active } = await supabase
        .from('battle_royales')
        .select('*')
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })

      const { data: upcoming } = await supabase
        .from('battle_royales')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })

      setActiveRoyales(active || [])
      setUpcomingRoyales(upcoming || [])
    } catch (error) {
      console.error('Failed to load battle royales:', error)
    }
    setLoading(false)
  }

  const joinBattleRoyale = async (royaleId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('battle_royale_participants').insert({
      battle_royale_id: royaleId,
      user_id: user.id,
      joined_at: new Date().toISOString()
    })

    loadBattleRoyales()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Crown className="h-10 w-10 text-yellow-500" />
            Battle Royale
          </h1>
          <p className="text-dark-400 mt-2">
            Last rapper standing wins it all. Elimination style battles.
          </p>
        </div>
        <Button size="lg">
          <Zap className="h-5 w-5 mr-2" />
          Create Battle Royale
        </Button>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Swords className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{activeRoyales.length}</p>
                <p className="text-sm text-dark-400">Active Royales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{upcomingRoyales.length}</p>
                <p className="text-sm text-dark-400">Waiting to Start</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">5,000</p>
                <p className="text-sm text-dark-400">Total Prize Pool</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Skull className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">1,234</p>
                <p className="text-sm text-dark-400">Total Eliminations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Battle Royales */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          Live Battle Royales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRoyales.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-dark-400">
                No active battle royales right now. Join one below or create your own!
              </CardContent>
            </Card>
          ) : (
            activeRoyales.map((royale) => (
              <Card key={royale.id} variant="bordered" className="border-green-500/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{royale.name}</CardTitle>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-500 text-white">LIVE</span>
                  </div>
                  <CardDescription>
                    Round {royale.current_round} of {royale.total_rounds}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{Math.round((royale.current_round / royale.total_rounds) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fire-500 rounded-full"
                          style={{ width: `${(royale.current_round / royale.total_rounds) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {royale.participants?.filter(p => !p.eliminated).length || 0} remaining
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        {royale.prize_pool} coins
                      </span>
                    </div>
                    <Button variant="outline" fullWidth>
                      Watch Live
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Upcoming Battle Royales */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Upcoming Battle Royales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingRoyales.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-dark-400">
                No upcoming battle royales. Be the first to create one!
              </CardContent>
            </Card>
          ) : (
            upcomingRoyales.map((royale) => (
              <Card key={royale.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{royale.name}</CardTitle>
                    <span className="px-2 py-1 rounded text-xs font-medium border border-dark-500">Waiting</span>
                  </div>
                  <CardDescription>
                    {royale.participants?.length || 0} / {royale.max_participants} participants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Filling up</span>
                        <span>{Math.round(((royale.participants?.length || 0) / royale.max_participants) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fire-500 rounded-full"
                          style={{ width: `${((royale.participants?.length || 0) / royale.max_participants) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Entry: {royale.entry_fee} coins</span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        {royale.prize_pool} coins
                      </span>
                    </div>
                    <Button fullWidth onClick={() => joinBattleRoyale(royale.id)}>
                      Join Battle Royale
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">How Battle Royale Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-fire-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-fire-500">1</span>
              </div>
              <h3 className="font-semibold mb-2">Join the Lobby</h3>
              <p className="text-sm text-dark-400">
                Pay the entry fee and wait for the lobby to fill up
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-fire-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-fire-500">2</span>
              </div>
              <h3 className="font-semibold mb-2">Random Matchups</h3>
              <p className="text-sm text-dark-400">
                Get paired with random opponents each round
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-fire-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-fire-500">3</span>
              </div>
              <h3 className="font-semibold mb-2">Win or Go Home</h3>
              <p className="text-sm text-dark-400">
                Lose a battle and you're eliminated from the tournament
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-fire-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-fire-500">4</span>
              </div>
              <h3 className="font-semibold mb-2">Last One Standing</h3>
              <p className="text-sm text-dark-400">
                The final survivor takes home the entire prize pool
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
