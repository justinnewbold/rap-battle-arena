'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Mic, Users, Music, Clock, Plus, Play, Radio } from 'lucide-react'

interface CypherSession {
  id: string
  name: string
  beat_name: string
  beat_bpm: number
  status: 'active' | 'scheduled' | 'completed'
  max_participants: number
  current_turn_user_id: string | null
  started_at: string
  participants: Array<{
    user_id: string
    username: string
    avatar_url: string
    bars_dropped: number
  }>
}

export default function CypherPage() {
  const [activeCyphers, setActiveCyphers] = useState<CypherSession[]>([])
  const [scheduledCyphers, setScheduledCyphers] = useState<CypherSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCyphers()
  }, [])

  const loadCyphers = async () => {
    setLoading(true)
    try {
      const { data: active } = await supabase
        .from('cypher_sessions')
        .select('*')
        .eq('status', 'active')
        .order('started_at', { ascending: false })

      const { data: scheduled } = await supabase
        .from('cypher_sessions')
        .select('*')
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })

      setActiveCyphers(active || [])
      setScheduledCyphers(scheduled || [])
    } catch (error) {
      console.error('Failed to load cyphers:', error)
    }
    setLoading(false)
  }

  const joinCypher = async (cypherId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('cypher_participants').insert({
      cypher_id: cypherId,
      user_id: user.id,
      joined_at: new Date().toISOString()
    })

    loadCyphers()
  }

  const createCypher = async () => {
    // Open cypher creation modal
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Radio className="h-10 w-10 text-green-500" />
            Cypher Sessions
          </h1>
          <p className="text-dark-400 mt-2">
            Join the circle. Freestyle, pass the mic, keep the flow going.
          </p>
        </div>
        <Button size="lg" onClick={createCypher}>
          <Plus className="h-5 w-5 mr-2" />
          Start Cypher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Radio className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeCyphers.length}</p>
                <p className="text-sm text-dark-400">Live Cyphers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {activeCyphers.reduce((sum, c) => sum + (c.participants?.length || 0), 0)}
                </p>
                <p className="text-sm text-dark-400">Rappers in Cyphers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Mic className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">12,456</p>
                <p className="text-sm text-dark-400">Bars Dropped Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{scheduledCyphers.length}</p>
                <p className="text-sm text-dark-400">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Cyphers */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          Live Cyphers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCyphers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-dark-400">
                No active cyphers right now. Start one and invite your crew!
              </CardContent>
            </Card>
          ) : (
            activeCyphers.map((cypher) => (
              <Card key={cypher.id} variant="bordered" className="border-green-500/50 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Radio className="h-5 w-5 text-green-500 animate-pulse" />
                      {cypher.name}
                    </CardTitle>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-500 text-white">LIVE</span>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    {cypher.beat_name} • {cypher.beat_bpm} BPM
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Participants */}
                    <div>
                      <p className="text-sm text-dark-400 mb-2">In the Cypher:</p>
                      <div className="flex flex-wrap gap-2">
                        {cypher.participants?.map((participant) => (
                          <div
                            key={participant.user_id}
                            className={`flex items-center gap-2 p-2 rounded-lg ${
                              cypher.current_turn_user_id === participant.user_id
                                ? 'bg-green-500/20 border border-green-500'
                                : 'bg-dark-700'
                            }`}
                          >
                            <div className="h-6 w-6 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold">
                              {participant.username[0]}
                            </div>
                            <span className="text-sm">{participant.username}</span>
                            {cypher.current_turn_user_id === participant.user_id && (
                              <Mic className="h-4 w-4 text-green-500 animate-bounce" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {cypher.participants?.length || 0} / {cypher.max_participants} spots
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        fullWidth
                        onClick={() => joinCypher(cypher.id)}
                        disabled={(cypher.participants?.length || 0) >= cypher.max_participants}
                      >
                        Join Cypher
                      </Button>
                      <Button variant="outline">
                        <Play className="h-4 w-4 mr-1" />
                        Watch
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Scheduled Cyphers */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Scheduled Cyphers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduledCyphers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-dark-400">
                No scheduled cyphers. Schedule one for your crew!
              </CardContent>
            </Card>
          ) : (
            scheduledCyphers.map((cypher) => (
              <Card key={cypher.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{cypher.name}</CardTitle>
                    <span className="px-2 py-1 rounded text-xs border border-dark-500">Scheduled</span>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    {cypher.beat_name} • {cypher.beat_bpm} BPM
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {cypher.participants?.length || 0} / {cypher.max_participants} RSVP'd
                      </span>
                      <span className="text-dark-400">
                        Starts in 2 hours
                      </span>
                    </div>
                    <Button fullWidth variant="outline">
                      RSVP
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
        <h2 className="text-2xl font-semibold mb-6">How Cyphers Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-2">Join the Circle</h3>
              <p className="text-sm text-dark-400">
                Enter an open cypher or start your own with friends
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <Music className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-2">Feel the Beat</h3>
              <p className="text-sm text-dark-400">
                The beat loops continuously. Everyone flows to the same rhythm
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                <Mic className="h-6 w-6 text-yellow-500" />
              </div>
              <h3 className="font-semibold mb-2">Drop Your Bars</h3>
              <p className="text-sm text-dark-400">
                When it's your turn, freestyle for 16-32 bars then pass the mic
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <Radio className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">Keep It Going</h3>
              <p className="text-sm text-dark-400">
                No competition, just vibes. The cypher continues until everyone's done
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Beats */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Popular Cypher Beats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: 'Boom Bap Classic', bpm: 90 },
            { name: 'Trap Soul', bpm: 140 },
            { name: 'Lo-Fi Chill', bpm: 85 },
            { name: 'West Coast G-Funk', bpm: 95 },
            { name: 'UK Grime', bpm: 140 },
            { name: 'Jazz Hop', bpm: 88 }
          ].map((beat) => (
            <Card key={beat.name} variant="interactive">
              <CardContent className="text-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <p className="font-medium text-sm">{beat.name}</p>
                <p className="text-xs text-dark-400">{beat.bpm} BPM</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
