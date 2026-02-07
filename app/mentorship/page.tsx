'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  GraduationCap,
  Users,
  Star,
  Calendar,
  Award,
  Target,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react'

interface Mentor {
  id: string
  username: string
  avatar_url: string
  rating: number
  specialty: string
  mentees_count: number
  success_rate: number
  battles_won: number
  available: boolean
  bio: string
}

interface MentorshipSession {
  id: string
  mentor: Mentor
  scheduled_at: string
  duration_minutes: number
  topic: string
  status: 'upcoming' | 'completed' | 'cancelled'
}

interface MenteeProgress {
  skill: string
  before: number
  after: number
  improvement: number
}

export default function MentorshipPage() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [mySessions, setMySessions] = useState<MentorshipSession[]>([])
  const [progress, setProgress] = useState<MenteeProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('find')

  useEffect(() => {
    loadMentorshipData()
  }, [])

  const loadMentorshipData = async () => {
    setLoading(true)
    try {
      const { data: mentorsData } = await supabase
        .from('mentors')
        .select('*')
        .eq('accepting_mentees', true)
        .order('success_rate', { ascending: false })

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: sessions } = await supabase
          .from('mentorship_sessions')
          .select('*, mentor:mentors(*)')
          .eq('mentee_id', user.id)
          .order('scheduled_at', { ascending: true })

        setMySessions(sessions || [])
      }

      setMentors(mentorsData || [])

      setProgress([
        { skill: 'Flow & Delivery', before: 45, after: 72, improvement: 27 },
        { skill: 'Wordplay', before: 38, after: 65, improvement: 27 },
        { skill: 'Freestyle', before: 25, after: 58, improvement: 33 },
        { skill: 'Stage Presence', before: 50, after: 78, improvement: 28 }
      ])
    } catch (error) {
      console.error('Failed to load mentorship data:', error)
    }
    setLoading(false)
  }

  const requestMentor = async (mentorId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('mentorship_requests').insert({
      mentor_id: mentorId,
      mentee_id: user.id,
      status: 'pending',
      created_at: new Date().toISOString()
    })

    loadMentorshipData()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <GraduationCap className="h-10 w-10 text-purple-500" />
            Mentorship Program
          </h1>
          <p className="text-dark-400 mt-2">
            Learn from experienced battlers and level up your skills
          </p>
        </div>
        <Button size="lg">
          <Users className="h-5 w-5 mr-2" />
          Become a Mentor
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{mentors.length}</p>
                <p className="text-sm text-dark-400">Active Mentors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">342</p>
                <p className="text-sm text-dark-400">Active Mentees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">89%</p>
                <p className="text-sm text-dark-400">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">1,234</p>
                <p className="text-sm text-dark-400">Sessions Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-dark-700">
        {['find', 'sessions', 'progress'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-fire-500 border-b-2 border-fire-500'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {tab === 'find' ? 'Find a Mentor' :
             tab === 'sessions' ? 'My Sessions' : 'My Progress'}
          </button>
        ))}
      </div>

      {/* Find Mentors Tab */}
      {activeTab === 'find' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-dark-400">
                No mentors available right now. Check back soon!
              </CardContent>
            </Card>
          ) : (
            mentors.map((mentor) => (
              <Card key={mentor.id} className="overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500" />
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-dark-600 flex items-center justify-center text-xl font-bold">
                      {mentor.username[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle>{mentor.username}</CardTitle>
                        {mentor.available && (
                          <span className="px-2 py-1 rounded text-xs bg-green-500 text-white">Available</span>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {mentor.rating.toFixed(1)} rating
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-dark-400 line-clamp-2">
                      {mentor.bio || 'Experienced battler ready to help you improve your skills.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded text-xs border border-dark-500">{mentor.specialty}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="font-bold">{mentor.battles_won}</p>
                        <p className="text-xs text-dark-400">Wins</p>
                      </div>
                      <div>
                        <p className="font-bold">{mentor.mentees_count}</p>
                        <p className="text-xs text-dark-400">Mentees</p>
                      </div>
                      <div>
                        <p className="font-bold">{mentor.success_rate}%</p>
                        <p className="text-xs text-dark-400">Success</p>
                      </div>
                    </div>
                    <Button
                      fullWidth
                      onClick={() => requestMentor(mentor.id)}
                      disabled={!mentor.available}
                    >
                      Request Mentorship
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {mySessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-dark-400">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-dark-500" />
                <p>No mentorship sessions yet.</p>
                <p className="text-sm">Find a mentor to schedule your first session!</p>
              </CardContent>
            </Card>
          ) : (
            mySessions.map((session) => (
              <Card key={session.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-dark-600 flex items-center justify-center font-bold">
                        {session.mentor?.username?.[0]}
                      </div>
                      <div>
                        <p className="font-medium">Session with {session.mentor?.username}</p>
                        <p className="text-sm text-dark-400">{session.topic}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">
                          {new Date(session.scheduled_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-dark-400">
                          {session.duration_minutes} minutes
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        session.status === 'upcoming' ? 'bg-blue-500' :
                        session.status === 'completed' ? 'bg-dark-600' : 'bg-red-500'
                      } text-white`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Skill Improvement
              </CardTitle>
              <CardDescription>
                Track your progress since starting mentorship
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {progress.map((item) => (
                  <div key={item.skill}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.skill}</span>
                      <span className="text-green-500 font-medium">+{item.improvement}%</span>
                    </div>
                    <div className="relative h-4 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-dark-500 rounded-full"
                        style={{ width: `${item.before}%` }}
                      />
                      <div
                        className="absolute h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${item.after}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-dark-400 mt-1">
                      <span>Before: {item.before}%</span>
                      <span>After: {item.after}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Mentorship Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-dark-700">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">First Session</p>
                  <p className="text-xs text-dark-400">Completed</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-dark-700">
                  <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="font-medium">Goal Setter</p>
                  <p className="text-xs text-dark-400">Set 3 goals</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-dark-700 opacity-50">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-dark-400" />
                  <p className="font-medium">Dedicated</p>
                  <p className="text-xs text-dark-400">5 sessions</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-dark-700 opacity-50">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-dark-400" />
                  <p className="font-medium">Rising Star</p>
                  <p className="text-xs text-dark-400">+50% skill</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* How It Works */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">How Mentorship Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-purple-500">1</span>
              </div>
              <h3 className="font-semibold mb-2">Find a Mentor</h3>
              <p className="text-sm text-dark-400">
                Browse mentors and find one that matches your style and goals
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-purple-500">2</span>
              </div>
              <h3 className="font-semibold mb-2">Send Request</h3>
              <p className="text-sm text-dark-400">
                Request mentorship and wait for approval from your chosen mentor
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-purple-500">3</span>
              </div>
              <h3 className="font-semibold mb-2">Schedule Sessions</h3>
              <p className="text-sm text-dark-400">
                Book 1-on-1 sessions to work on specific skills and techniques
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-purple-500">4</span>
              </div>
              <h3 className="font-semibold mb-2">Level Up</h3>
              <p className="text-sm text-dark-400">
                Track your progress and watch your battle skills improve
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
