'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Trophy, Star, Crown, Medal, Play, Calendar, Users, Flame } from 'lucide-react'

interface HallOfFameEntry {
  id: string
  battle_id: string
  inducted_at: string
  category: 'legendary_battle' | 'best_verse' | 'underdog_victory' | 'perfect_performance' | 'community_choice'
  title: string
  description: string
  view_count: number
  battle: {
    id: string
    created_at: string
    winner: {
      id: string
      username: string
      avatar_url: string
    }
    loser: {
      id: string
      username: string
      avatar_url: string
    }
  }
}

interface Legend {
  id: string
  username: string
  avatar_url: string
  total_wins: number
  hall_of_fame_entries: number
  titles: string[]
  inducted_at: string
}

export default function HallOfFamePage() {
  const [legendaryBattles, setLegendaryBattles] = useState<HallOfFameEntry[]>([])
  const [legends, setLegends] = useState<Legend[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHallOfFame()
  }, [selectedCategory])

  const loadHallOfFame = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('hall_of_fame')
        .select('*')
        .order('inducted_at', { ascending: false })

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data: battles } = await query.limit(20)

      const { data: legendsData } = await supabase
        .from('legends')
        .select('*')
        .order('hall_of_fame_entries', { ascending: false })
        .limit(10)

      setLegendaryBattles(battles || [])
      setLegends(legendsData || [])
    } catch (error) {
      console.error('Failed to load hall of fame:', error)
    }
    setLoading(false)
  }

  const categories = [
    { id: 'all', name: 'All', icon: Trophy },
    { id: 'legendary_battle', name: 'Legendary Battles', icon: Crown },
    { id: 'best_verse', name: 'Best Verses', icon: Star },
    { id: 'underdog_victory', name: 'Underdog Victories', icon: Medal },
    { id: 'perfect_performance', name: 'Perfect Performances', icon: Flame },
    { id: 'community_choice', name: 'Community Choice', icon: Users }
  ]

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category)
    return cat ? cat.icon : Trophy
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'legendary_battle': return 'text-yellow-500'
      case 'best_verse': return 'text-purple-500'
      case 'underdog_victory': return 'text-green-500'
      case 'perfect_performance': return 'text-red-500'
      case 'community_choice': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="h-12 w-12 text-yellow-500" />
          <h1 className="text-5xl font-bold">Hall of Fame</h1>
          <Trophy className="h-12 w-12 text-yellow-500" />
        </div>
        <p className="text-xl text-dark-400">
          Where legends are immortalized. The greatest battles and performers in history.
        </p>
      </div>

      {/* Legends Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 flex items-center gap-2">
          <Crown className="h-8 w-8 text-yellow-500" />
          The Legends
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {legends.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-dark-400">
                No legends inducted yet. Great battles await!
              </CardContent>
            </Card>
          ) : (
            legends.map((legend, index) => (
              <Card
                key={legend.id}
                className={`relative overflow-hidden ${
                  index === 0 ? 'border-yellow-500 bg-gradient-to-b from-yellow-500/10 to-transparent' :
                  index === 1 ? 'border-gray-400 bg-gradient-to-b from-gray-400/10 to-transparent' :
                  index === 2 ? 'border-orange-500 bg-gradient-to-b from-orange-500/10 to-transparent' : ''
                }`}
              >
                {index < 3 && (
                  <div className={`absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center
                    ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'}`}
                  >
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                )}
                <CardContent className="text-center">
                  <div className="h-20 w-20 rounded-full bg-dark-600 ring-4 ring-offset-2 ring-offset-dark-800 ring-yellow-500/50 mx-auto mb-3 flex items-center justify-center text-2xl font-bold">
                    {legend.username[0]}
                  </div>
                  <h3 className="font-bold text-lg">{legend.username}</h3>
                  <div className="flex flex-wrap gap-1 justify-center mt-2">
                    {legend.titles?.slice(0, 2).map((title) => (
                      <span key={title} className="px-2 py-0.5 rounded text-xs bg-dark-700">
                        {title}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="font-bold text-xl">{legend.total_wins}</p>
                      <p className="text-dark-400">Wins</p>
                    </div>
                    <div>
                      <p className="font-bold text-xl">{legend.hall_of_fame_entries}</p>
                      <p className="text-dark-400">HOF Entries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((category) => {
          const Icon = category.icon
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'primary' : 'outline'}
              onClick={() => setSelectedCategory(category.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {category.name}
            </Button>
          )
        })}
      </div>

      {/* Legendary Battles */}
      <section>
        <h2 className="text-3xl font-semibold mb-6">Legendary Moments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {legendaryBattles.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-dark-400">
                No legendary moments yet in this category. Keep battling!
              </CardContent>
            </Card>
          ) : (
            legendaryBattles.map((entry) => {
              const CategoryIcon = getCategoryIcon(entry.category)
              return (
                <Card key={entry.id} className="overflow-hidden">
                  <div className="h-48 bg-gradient-to-br from-purple-900 via-black to-yellow-900 relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative z-10 text-center">
                      <CategoryIcon className={`h-16 w-16 mx-auto mb-2 ${getCategoryColor(entry.category)}`} />
                      <span className="px-2 py-1 rounded text-xs bg-black/50">
                        {entry.category.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="absolute bottom-4 right-4"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Watch
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle>{entry.title}</CardTitle>
                    <CardDescription>{entry.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {entry.battle && (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-dark-600 flex items-center justify-center text-sm font-bold">
                                {entry.battle.winner?.username?.[0]}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{entry.battle.winner?.username}</p>
                                <span className="px-2 py-0.5 rounded text-xs border border-green-500 text-green-500">Winner</span>
                              </div>
                            </div>
                            <span className="text-dark-400">vs</span>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-dark-600 flex items-center justify-center text-sm font-bold">
                                {entry.battle.loser?.username?.[0]}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{entry.battle.loser?.username}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-right text-sm text-dark-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(entry.inducted_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="h-4 w-4" />
                          {entry.view_count.toLocaleString()} views
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </section>

      {/* Nomination Section */}
      <section className="mt-12">
        <Card className="bg-gradient-to-r from-yellow-500/10 via-transparent to-purple-500/10">
          <CardContent className="py-8 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-2xl font-bold mb-2">Nominate a Battle</h3>
            <p className="text-dark-400 mb-6 max-w-md mx-auto">
              Know a battle that deserves to be immortalized? Nominate it for the Hall of Fame.
              Community votes determine which battles make history.
            </p>
            <Button size="lg">
              <Star className="h-5 w-5 mr-2" />
              Submit Nomination
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Stats */}
      <section className="mt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="text-center">
              <p className="text-4xl font-bold text-yellow-500">{legends.length}</p>
              <p className="text-dark-400">Inducted Legends</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <p className="text-4xl font-bold text-purple-500">{legendaryBattles.length}</p>
              <p className="text-dark-400">Legendary Battles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <p className="text-4xl font-bold text-green-500">
                {legendaryBattles.reduce((sum, b) => sum + b.view_count, 0).toLocaleString()}
              </p>
              <p className="text-dark-400">Total Views</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <p className="text-4xl font-bold text-blue-500">2024</p>
              <p className="text-dark-400">Since</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
