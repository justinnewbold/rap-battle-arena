'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useUserStore } from '@/lib/store'
import {
  getTrendingBattles,
  getRisingStars,
  getFeaturedHighlights,
  getCurrentTheme,
  TrendingBattle,
  RisingStar,
  Highlight,
  WeeklyTheme
} from '@/lib/challenges'

export default function TrendingPage() {
  const { user } = useUserStore()
  const [activeTab, setActiveTab] = useState<'battles' | 'stars' | 'highlights'>('battles')
  const [trendingBattles, setTrendingBattles] = useState<TrendingBattle[]>([])
  const [risingStars, setRisingStars] = useState<RisingStar[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [currentTheme, setCurrentTheme] = useState<WeeklyTheme | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [battles, stars, featured, theme] = await Promise.all([
        getTrendingBattles(20),
        getRisingStars(10),
        getFeaturedHighlights(10),
        getCurrentTheme()
      ])
      setTrendingBattles(battles)
      setRisingStars(stars)
      setHighlights(featured)
      setCurrentTheme(theme)
      setLoading(false)
    }
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Trending</h1>
          <p className="text-gray-400">Discover what&apos;s hot in the arena</p>
        </div>

        {/* Weekly Theme Banner */}
        {currentTheme && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-purple-400 uppercase tracking-wider">Weekly Theme</span>
                <h2 className="text-2xl font-bold mt-1">{currentTheme.title}</h2>
                <p className="text-gray-400 mt-2">{currentTheme.description}</p>
                <div className="flex gap-2 mt-3">
                  {currentTheme.keywords.slice(0, 5).map((keyword) => (
                    <span key={keyword} className="px-3 py-1 bg-purple-500/20 rounded-full text-sm">
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-400">
                  {currentTheme.bonus_multiplier}x
                </div>
                <div className="text-sm text-gray-400">Score Bonus</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800 pb-4">
          {[
            { id: 'battles', label: 'Hot Battles', icon: '🔥' },
            { id: 'stars', label: 'Rising Stars', icon: '⭐' },
            { id: 'highlights', label: 'Best Moments', icon: '🎬' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Trending Battles */}
            {activeTab === 'battles' && (
              <div className="grid gap-4">
                {trendingBattles.map((item, index) => (
                  <motion.div
                    key={item.battle.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/battle/replay/${item.battle.id}`}>
                      <div className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-gray-500 w-8">
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {item.battle.player1?.username || 'Player 1'}
                              </span>
                              <span className="text-gray-500">vs</span>
                              <span className="font-semibold">
                                {item.battle.player2?.username || 'Player 2'}
                              </span>
                              {item.battle.winner_id && (
                                <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                  Winner: {item.battle.winner_id === item.battle.player1_id
                                    ? item.battle.player1?.username
                                    : item.battle.player2?.username}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm text-gray-400">
                              <span>👁 {item.spectatorCount} viewers</span>
                              <span>🗳 {item.voteCount} votes</span>
                              <span>🎬 {item.highlightCount} highlights</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-red-400">
                              {Math.round(item.trendingScore)}
                            </div>
                            <div className="text-xs text-gray-500">Trending Score</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
                {trendingBattles.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No trending battles yet. Start battling to appear here!
                  </div>
                )}
              </div>
            )}

            {/* Rising Stars */}
            {activeTab === 'stars' && (
              <div className="grid gap-4 md:grid-cols-2">
                {risingStars.map((star, index) => (
                  <motion.div
                    key={star.user.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/profile/${star.user.id}`}>
                      <div className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-2xl">
                              {star.user.avatar_url ? (
                                <img
                                  src={star.user.avatar_url}
                                  alt={star.user.username}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                star.user.username.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold">
                              #{index + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{star.user.username}</h3>
                            <div className="text-sm text-gray-400">
                              ELO: {star.user.elo_rating}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold">
                              +{star.eloGain} ELO
                            </div>
                            <div className="text-sm text-gray-400">
                              {star.recentWins} wins • {star.winStreak} streak
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
                {risingStars.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    No rising stars yet. Keep battling to climb the ranks!
                  </div>
                )}
              </div>
            )}

            {/* Highlights */}
            {activeTab === 'highlights' && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {highlights.map((highlight, index) => (
                  <motion.div
                    key={highlight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors"
                  >
                    <div className="aspect-video bg-gray-900 flex items-center justify-center">
                      {highlight.thumbnail_url ? (
                        <img
                          src={highlight.thumbnail_url}
                          alt={highlight.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">🎬</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-1">{highlight.title}</h3>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {highlight.description || 'Epic battle moment'}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>by {highlight.user?.username}</span>
                        <div className="flex gap-3">
                          <span>👁 {highlight.views}</span>
                          <span>❤️ {highlight.likes}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {highlights.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-gray-500">
                    No highlights yet. Create epic moments in your battles!
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
