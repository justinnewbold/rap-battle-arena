'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  Brain,
  MessageSquare,
  Clock,
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

interface AnalyticsData {
  totalBattles: number
  wins: number
  losses: number
  winStreak: number
  bestWinStreak: number
  averageScore: number
  totalBarsDropped: number
  uniqueOpponents: number
  favoriteStyle: string
  peakRating: number
  currentRating: number
  recentTrend: 'up' | 'down' | 'stable'
}

interface SkillBreakdown {
  category: string
  score: number
  trend: number
  description: string
}

interface RecentBattle {
  id: string
  opponent: string
  result: 'win' | 'loss'
  score: number
  date: string
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [skills, setSkills] = useState<SkillBreakdown[]>([])
  const [recentBattles, setRecentBattles] = useState<RecentBattle[]>([])
  const [wordCloud, setWordCloud] = useState<Array<{ word: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user's battle statistics
      const { data: battles } = await supabase
        .from('battles')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)

      // Calculate analytics from battles
      const wins = battles?.filter(b => b.winner_id === user.id).length || 0
      const losses = (battles?.length || 0) - wins

      setAnalytics({
        totalBattles: battles?.length || 0,
        wins,
        losses,
        winStreak: 3,
        bestWinStreak: 7,
        averageScore: 8.2,
        totalBarsDropped: 1456,
        uniqueOpponents: 45,
        favoriteStyle: 'Aggressive',
        peakRating: 1850,
        currentRating: 1720,
        recentTrend: 'up'
      })

      setSkills([
        { category: 'Flow & Delivery', score: 85, trend: 5, description: 'Rhythm, timing, and vocal control' },
        { category: 'Wordplay & Punchlines', score: 78, trend: 3, description: 'Clever metaphors and impactful lines' },
        { category: 'Crowd Engagement', score: 82, trend: -2, description: 'Audience connection and reactions' },
        { category: 'Freestyle Ability', score: 71, trend: 8, description: 'Off-the-top improvisation skills' },
        { category: 'Battle IQ', score: 88, trend: 1, description: 'Strategy and opponent analysis' },
        { category: 'Stage Presence', score: 79, trend: 4, description: 'Confidence and performance energy' }
      ])

      setRecentBattles([
        { id: '1', opponent: 'MC Thunder', result: 'win', score: 9.2, date: '2024-01-15' },
        { id: '2', opponent: 'Lyrical Genius', result: 'win', score: 8.7, date: '2024-01-14' },
        { id: '3', opponent: 'Flow Master', result: 'loss', score: 7.8, date: '2024-01-12' },
        { id: '4', opponent: 'Rhyme King', result: 'win', score: 8.9, date: '2024-01-10' },
        { id: '5', opponent: 'Beat Slayer', result: 'win', score: 9.0, date: '2024-01-08' }
      ])

      setWordCloud([
        { word: 'fire', count: 45 },
        { word: 'flow', count: 38 },
        { word: 'bars', count: 35 },
        { word: 'real', count: 32 },
        { word: 'game', count: 28 },
        { word: 'king', count: 25 },
        { word: 'top', count: 22 },
        { word: 'skill', count: 20 },
        { word: 'legend', count: 18 },
        { word: 'crown', count: 15 }
      ])
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
    setLoading(false)
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (trend < 0) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getWordSize = (count: number, maxCount: number) => {
    const minSize = 14
    const maxSize = 36
    return minSize + ((count / maxCount) * (maxSize - minSize))
  }

  if (loading || !analytics) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-64 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const maxWordCount = Math.max(...wordCloud.map(w => w.count))

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <BarChart3 className="h-10 w-10 text-blue-500" />
            Performance Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Deep insights into your battle performance and growth
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{analytics.totalBattles}</p>
                <p className="text-sm text-muted-foreground">Total Battles</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-500">{analytics.wins}</p>
                <p className="text-sm text-muted-foreground">Wins</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {analytics.totalBattles > 0
                    ? Math.round((analytics.wins / analytics.totalBattles) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{analytics.currentRating}</p>
                <p className="text-sm text-muted-foreground">Current Rating</p>
              </div>
              <div className="flex items-center gap-1">
                {analytics.recentTrend === 'up' && <ArrowUp className="h-6 w-6 text-green-500" />}
                {analytics.recentTrend === 'down' && <ArrowDown className="h-6 w-6 text-red-500" />}
                {analytics.recentTrend === 'stable' && <Minus className="h-6 w-6 text-gray-500" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Peak: {analytics.peakRating}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{analytics.winStreak}</p>
                <p className="text-sm text-muted-foreground">Current Streak</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Best: {analytics.bestWinStreak}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="skills" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="skills">Skill Breakdown</TabsTrigger>
          <TabsTrigger value="history">Battle History</TabsTrigger>
          <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Skill Analysis
              </CardTitle>
              <CardDescription>
                Your performance across different battle categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {skills.map((skill) => (
                  <div key={skill.category}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{skill.category}</p>
                        <p className="text-xs text-muted-foreground">{skill.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{skill.score}</span>
                        <div className="flex items-center gap-1 text-sm">
                          {getTrendIcon(skill.trend)}
                          <span className={skill.trend > 0 ? 'text-green-500' : skill.trend < 0 ? 'text-red-500' : 'text-gray-500'}>
                            {skill.trend > 0 ? '+' : ''}{skill.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Progress value={skill.score} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Battles
              </CardTitle>
              <CardDescription>
                Your last 5 battle performances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBattles.map((battle) => (
                  <div
                    key={battle.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center
                        ${battle.result === 'win' ? 'bg-green-500/10' : 'bg-red-500/10'}`}
                      >
                        {battle.result === 'win' ? (
                          <Award className="h-5 w-5 text-green-500" />
                        ) : (
                          <Target className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">vs {battle.opponent}</p>
                        <p className="text-sm text-muted-foreground">{battle.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{battle.score.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                      <Badge variant={battle.result === 'win' ? 'default' : 'destructive'}>
                        {battle.result.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Battles
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vocabulary">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Word Cloud
              </CardTitle>
              <CardDescription>
                Your most used words and phrases in battles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 justify-center p-8 min-h-[200px]">
                {wordCloud.map((item) => (
                  <span
                    key={item.word}
                    className="cursor-default hover:text-primary transition-colors"
                    style={{
                      fontSize: `${getWordSize(item.count, maxWordCount)}px`,
                      opacity: 0.5 + ((item.count / maxWordCount) * 0.5)
                    }}
                  >
                    {item.word}
                  </span>
                ))}
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Vocabulary Stats</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalBarsDropped}</p>
                    <p className="text-sm text-muted-foreground">Total Bars</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">847</p>
                    <p className="text-sm text-muted-foreground">Unique Words</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">12.3</p>
                    <p className="text-sm text-muted-foreground">Avg Words/Bar</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>
                Personalized recommendations based on your performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-medium text-green-500 mb-2">Strengths</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Excellent battle IQ - you read opponents well and adapt quickly</li>
                    <li>Strong flow control with consistent delivery timing</li>
                    <li>High crowd engagement scores in competitive matches</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <h4 className="font-medium text-yellow-500 mb-2">Areas to Improve</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Freestyle ability could use more practice - consider daily exercises</li>
                    <li>Wordplay complexity is good but could be more consistent</li>
                    <li>Some battles show energy dips in round 2 - work on stamina</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-medium text-blue-500 mb-2">Recommended Training</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Practice 5-minute freestyle sessions daily to improve improvisation</li>
                    <li>Study battles from top-rated freestylers for technique inspiration</li>
                    <li>Focus on building a larger vocabulary of rhyme schemes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{analytics.uniqueOpponents}</p>
            <p className="text-sm text-muted-foreground">Unique Opponents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{analytics.averageScore.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Avg Battle Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{analytics.favoriteStyle}</p>
            <p className="text-sm text-muted-foreground">Dominant Style</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">23</p>
            <p className="text-sm text-muted-foreground">Days Active</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
