'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  MapPin,
  Trophy,
  Users,
  Crown,
  Swords,
  Calendar,
  Star,
  Globe
} from 'lucide-react'

interface Region {
  id: string
  name: string
  code: string
  flag: string
  total_battlers: number
  active_leagues: number
  champion: {
    username: string
    avatar_url: string
    wins: number
  } | null
}

interface League {
  id: string
  name: string
  region: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  participants: number
  max_participants: number
  prize_pool: number
  starts_at: string
  status: 'upcoming' | 'active' | 'completed'
}

interface RegionalStanding {
  rank: number
  user_id: string
  username: string
  avatar_url: string
  region: string
  points: number
  wins: number
  losses: number
}

const REGIONS: Region[] = [
  { id: 'na', name: 'North America', code: 'NA', flag: '🇺🇸', total_battlers: 12500, active_leagues: 8, champion: { username: 'MC Flame', avatar_url: '', wins: 234 } },
  { id: 'eu', name: 'Europe', code: 'EU', flag: '🇪🇺', total_battlers: 9800, active_leagues: 6, champion: { username: 'LyricKing', avatar_url: '', wins: 198 } },
  { id: 'uk', name: 'United Kingdom', code: 'UK', flag: '🇬🇧', total_battlers: 4500, active_leagues: 4, champion: { username: 'GrimeGod', avatar_url: '', wins: 156 } },
  { id: 'latam', name: 'Latin America', code: 'LATAM', flag: '🌎', total_battlers: 6200, active_leagues: 5, champion: { username: 'FlowMaster', avatar_url: '', wins: 142 } },
  { id: 'asia', name: 'Asia Pacific', code: 'APAC', flag: '🌏', total_battlers: 8100, active_leagues: 5, champion: { username: 'RhymeNinja', avatar_url: '', wins: 178 } },
  { id: 'africa', name: 'Africa', code: 'AFR', flag: '🌍', total_battlers: 2800, active_leagues: 3, champion: null }
]

export default function RegionalLeaguesPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>('na')
  const [leagues, setLeagues] = useState<League[]>([])
  const [standings, setStandings] = useState<RegionalStanding[]>([])
  const [userRegion] = useState<string>('na')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('leagues')

  useEffect(() => {
    loadRegionalData()
  }, [selectedRegion])

  const loadRegionalData = async () => {
    setLoading(true)
    try {
      const { data: leaguesData } = await supabase
        .from('regional_leagues')
        .select('*')
        .eq('region', selectedRegion)
        .order('starts_at', { ascending: true })

      const { data: standingsData } = await supabase
        .from('regional_standings')
        .select('*')
        .eq('region', selectedRegion)
        .order('points', { ascending: false })
        .limit(25)

      setLeagues(leaguesData || [])
      setStandings(standingsData || [])
    } catch (error) {
      console.error('Failed to load regional data:', error)
    }
    setLoading(false)
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-orange-700'
      case 'silver': return 'bg-gray-400'
      case 'gold': return 'bg-yellow-500'
      case 'platinum': return 'bg-cyan-400'
      case 'diamond': return 'bg-blue-400'
      default: return 'bg-gray-500'
    }
  }

  const currentRegion = REGIONS.find(r => r.id === selectedRegion)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Globe className="h-10 w-10 text-blue-500" />
            Regional Leagues
          </h1>
          <p className="text-dark-400 mt-2">
            Compete in your region and represent your area
          </p>
        </div>
        <span className="px-4 py-2 rounded text-lg border border-dark-500 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Your Region: {REGIONS.find(r => r.id === userRegion)?.code}
        </span>
      </div>

      {/* Region Selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {REGIONS.map((region) => (
          <Card
            key={region.id}
            variant={selectedRegion === region.id ? 'bordered' : 'interactive'}
            className={`cursor-pointer ${selectedRegion === region.id ? 'border-fire-500 bg-fire-500/5' : ''}`}
            onClick={() => setSelectedRegion(region.id)}
          >
            <CardContent className="text-center">
              <span className="text-3xl">{region.flag}</span>
              <p className="font-semibold mt-2">{region.code}</p>
              <p className="text-xs text-dark-400">{region.name}</p>
              <p className="text-xs mt-1">{region.total_battlers.toLocaleString()} battlers</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Region Overview */}
      {currentRegion && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{currentRegion.flag}</span>
                <div>
                  <CardTitle className="text-2xl">{currentRegion.name}</CardTitle>
                  <CardDescription>
                    {currentRegion.total_battlers.toLocaleString()} registered battlers • {currentRegion.active_leagues} active leagues
                  </CardDescription>
                </div>
              </div>
              {currentRegion.champion && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Crown className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-xs text-dark-400">Regional Champion</p>
                    <p className="font-bold">{currentRegion.champion.username}</p>
                    <p className="text-xs text-yellow-500">{currentRegion.champion.wins} wins</p>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-dark-700">
        {['leagues', 'standings', 'qualifiers'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-fire-500 border-b-2 border-fire-500'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {tab === 'leagues' ? 'Active Leagues' :
             tab === 'standings' ? 'Regional Standings' : 'Qualifiers'}
          </button>
        ))}
      </div>

      {/* Leagues Tab */}
      {activeTab === 'leagues' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leagues.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-dark-400">
                No active leagues in this region. Check back soon!
              </CardContent>
            </Card>
          ) : (
            leagues.map((league) => (
              <Card key={league.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full ${getTierColor(league.tier)} flex items-center justify-center`}>
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{league.name}</CardTitle>
                        <CardDescription className="capitalize">{league.tier} Tier</CardDescription>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      league.status === 'active' ? 'bg-green-500' : 'border border-dark-500'
                    } text-white`}>
                      {league.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Participants</span>
                        <span>{league.participants} / {league.max_participants}</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fire-500 rounded-full"
                          style={{ width: `${(league.participants / league.max_participants) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        {league.prize_pool} coins
                      </div>
                      <div className="flex items-center gap-1 text-dark-400">
                        <Calendar className="h-4 w-4" />
                        {new Date(league.starts_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button fullWidth>
                      {league.status === 'upcoming' ? 'Register' : 'View Details'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              {currentRegion?.name} Standings
            </CardTitle>
            <CardDescription>
              Top 25 battlers in the region
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {standings.length === 0 ? (
                <p className="text-center text-dark-400 py-8">
                  No standings data available yet.
                </p>
              ) : (
                standings.map((standing) => (
                  <div
                    key={standing.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg hover:bg-dark-700/50 transition-colors ${
                      standing.rank <= 3 ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold
                        ${standing.rank === 1 ? 'bg-yellow-500 text-yellow-950' :
                          standing.rank === 2 ? 'bg-gray-300 text-gray-700' :
                          standing.rank === 3 ? 'bg-orange-400 text-orange-950' :
                          'bg-dark-600 text-dark-300'}`}
                      >
                        {standing.rank}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-dark-600 flex items-center justify-center font-bold">
                        {standing.username[0]}
                      </div>
                      <div>
                        <p className="font-medium">{standing.username}</p>
                        <p className="text-xs text-dark-400">
                          {standing.wins}W - {standing.losses}L
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{standing.points.toLocaleString()}</p>
                      <p className="text-xs text-dark-400">points</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Qualifiers Tab */}
      {activeTab === 'qualifiers' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-2xl font-bold mb-2">World Championship Qualifiers</h3>
            <p className="text-dark-400 mb-6 max-w-md mx-auto">
              Top performers from each region qualify for the annual World Championship.
              Current qualification period ends in 45 days.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
              <div className="p-4 rounded-lg bg-dark-700">
                <p className="text-2xl font-bold text-yellow-500">1st</p>
                <p className="text-xs text-dark-400">Auto-qualify</p>
              </div>
              <div className="p-4 rounded-lg bg-dark-700">
                <p className="text-2xl font-bold text-gray-400">2nd-5th</p>
                <p className="text-xs text-dark-400">Playoff spot</p>
              </div>
              <div className="p-4 rounded-lg bg-dark-700">
                <p className="text-2xl font-bold text-orange-400">6th-10th</p>
                <p className="text-xs text-dark-400">Wildcard</p>
              </div>
            </div>
            <Button size="lg">
              <Swords className="h-5 w-5 mr-2" />
              View Qualification Rules
            </Button>
          </CardContent>
        </Card>
      )}

      {/* How Regional Leagues Work */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">How Regional Leagues Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">Join Your Region</h3>
              <p className="text-sm text-dark-400">
                Automatically assigned based on location, or choose your preferred region
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <Swords className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-2">Battle & Earn Points</h3>
              <p className="text-sm text-dark-400">
                Win battles against regional opponents to climb the standings
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <h3 className="font-semibold mb-2">Enter Leagues</h3>
              <p className="text-sm text-dark-400">
                Compete in tiered leagues from Bronze to Diamond for bigger prizes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Crown className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-2">Qualify for Worlds</h3>
              <p className="text-sm text-dark-400">
                Top regional performers qualify for the World Championship
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
