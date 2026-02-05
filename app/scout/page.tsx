'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useUserStore } from '@/lib/store'
import {
  discoverTalent,
  getScoutProfile,
  upsertScoutProfile,
  sendTalentInquiry,
  ScoutProfile
} from '@/lib/competitive-features'

export default function ScoutPage() {
  const { user } = useUserStore()
  const [activeTab, setActiveTab] = useState<'discover' | 'my-profile' | 'inquiries'>('discover')
  const [talent, setTalent] = useState<ScoutProfile[]>([])
  const [myProfile, setMyProfile] = useState<ScoutProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTalent, setSelectedTalent] = useState<ScoutProfile | null>(null)
  const [filters, setFilters] = useState({
    genres: [] as string[],
    lookingFor: [] as string[],
    minElo: 0,
    sortBy: 'elo' as 'elo' | 'battles' | 'wins' | 'recent'
  })
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    company: '',
    type: 'collaboration' as 'record_deal' | 'collaboration' | 'feature' | 'management' | 'other',
    message: ''
  })
  const [sending, setSending] = useState(false)

  const allGenres = ['Hip Hop', 'Trap', 'Boom Bap', 'Drill', 'R&B', 'Conscious', 'Melodic', 'Aggressive']
  const lookingForOptions = [
    { value: 'record_deal', label: 'Record Deal' },
    { value: 'collaborations', label: 'Collaborations' },
    { value: 'features', label: 'Features' },
    { value: 'management', label: 'Management' }
  ]

  useEffect(() => {
    loadData()
  }, [filters, user])

  async function loadData() {
    setLoading(true)
    const [talentList, profile] = await Promise.all([
      discoverTalent({
        genres: filters.genres.length > 0 ? filters.genres : undefined,
        lookingFor: filters.lookingFor.length > 0 ? filters.lookingFor : undefined,
        minElo: filters.minElo || undefined,
        sortBy: filters.sortBy,
        limit: 50
      }),
      user ? getScoutProfile(user.id) : Promise.resolve(null)
    ])
    setTalent(talentList)
    setMyProfile(profile)
    setLoading(false)
  }

  async function handleSendInquiry() {
    if (!selectedTalent) return
    setSending(true)

    const inquiry = await sendTalentInquiry(
      selectedTalent.id,
      user?.id || null,
      {
        from_email: inquiryForm.email,
        from_name: inquiryForm.name,
        from_company: inquiryForm.company || undefined,
        inquiry_type: inquiryForm.type,
        message: inquiryForm.message
      }
    )

    if (inquiry) {
      setSelectedTalent(null)
      setInquiryForm({
        name: '',
        email: '',
        company: '',
        type: 'collaboration',
        message: ''
      })
    }
    setSending(false)
  }

  async function handleUpdateProfile(updates: Partial<ScoutProfile>) {
    if (!user) return
    const updated = await upsertScoutProfile(user.id, updates)
    if (updated) {
      setMyProfile(updated)
    }
  }

  const toggleGenre = (genre: string) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  const toggleLookingFor = (value: string) => {
    setFilters(prev => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(value)
        ? prev.lookingFor.filter(l => l !== value)
        : [...prev.lookingFor, value]
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Scout Mode</h1>
          <p className="text-gray-400">Discover talented artists and connect with industry professionals</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-800 pb-4">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'discover' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🔍 Discover Talent
          </button>
          {user && (
            <>
              <button
                onClick={() => setActiveTab('my-profile')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'my-profile' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                👤 My Scout Profile
              </button>
              <button
                onClick={() => setActiveTab('inquiries')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'inquiries' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                📬 Inquiries
              </button>
            </>
          )}
        </div>

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <>
            {/* Filters */}
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="font-semibold mb-3">Filters</h3>

              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {allGenres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.genres.includes(genre)
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-400 mb-2 block">Looking For</label>
                <div className="flex flex-wrap gap-2">
                  {lookingForOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleLookingFor(option.value)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        filters.lookingFor.includes(option.value)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Min ELO</label>
                  <input
                    type="number"
                    value={filters.minElo}
                    onChange={(e) => setFilters({ ...filters, minElo: parseInt(e.target.value) || 0 })}
                    className="w-32 px-3 py-2 bg-gray-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as typeof filters.sortBy })}
                    className="px-3 py-2 bg-gray-700 rounded-lg"
                  >
                    <option value="elo">Highest ELO</option>
                    <option value="battles">Most Battles</option>
                    <option value="wins">Most Wins</option>
                    <option value="recent">Recently Active</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Talent Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {talent.map((profile, index) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                        {profile.user?.avatar_url ? (
                          <img
                            src={profile.user.avatar_url}
                            alt={profile.user.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          profile.user?.username?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{profile.user?.username}</h3>
                        <div className="text-sm text-gray-400">
                          ELO: {profile.user?.elo_rating} • {profile.user?.wins}W / {profile.user?.losses}L
                        </div>
                      </div>
                    </div>

                    {profile.bio && (
                      <p className="text-sm text-gray-400 mt-3 line-clamp-2">{profile.bio}</p>
                    )}

                    {profile.genres && profile.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {profile.genres.slice(0, 3).map((genre) => (
                          <span key={genre} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {profile.looking_for && profile.looking_for.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {profile.looking_for.map((item) => (
                          <span key={item} className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs capitalize">
                            {item.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Link href={`/profile/${profile.user_id}`} className="flex-1">
                        <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors">
                          View Profile
                        </button>
                      </Link>
                      <button
                        onClick={() => setSelectedTalent(profile)}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Contact
                      </button>
                    </div>
                  </motion.div>
                ))}

                {talent.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No talent found matching your criteria
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* My Profile Tab */}
        {activeTab === 'my-profile' && user && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Your Scout Profile</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Discoverable</label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={myProfile?.is_discoverable || false}
                      onChange={(e) => handleUpdateProfile({ is_discoverable: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>Allow scouts and labels to discover your profile</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Bio</label>
                  <textarea
                    value={myProfile?.bio || ''}
                    onChange={(e) => handleUpdateProfile({ bio: e.target.value })}
                    placeholder="Tell scouts about yourself..."
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg h-24"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Looking For</label>
                  <div className="flex flex-wrap gap-2">
                    {lookingForOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          const current = myProfile?.looking_for || []
                          const updated = current.includes(option.value)
                            ? current.filter(l => l !== option.value)
                            : [...current, option.value]
                          handleUpdateProfile({ looking_for: updated })
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          myProfile?.looking_for?.includes(option.value)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Genres</label>
                  <div className="flex flex-wrap gap-2">
                    {allGenres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => {
                          const current = myProfile?.genres || []
                          const updated = current.includes(genre)
                            ? current.filter(g => g !== genre)
                            : [...current, genre]
                          handleUpdateProfile({ genres: updated })
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          myProfile?.genres?.includes(genre)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={myProfile?.contact_email || ''}
                    onChange={(e) => handleUpdateProfile({ contact_email: e.target.value })}
                    placeholder="business@example.com"
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Portfolio URL</label>
                  <input
                    type="url"
                    value={myProfile?.portfolio_url || ''}
                    onChange={(e) => handleUpdateProfile({ portfolio_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Modal */}
        {selectedTalent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTalent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">Contact {selectedTalent.user?.username}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email *</label>
                  <input
                    type="email"
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Company/Label</label>
                  <input
                    type="text"
                    value={inquiryForm.company}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, company: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Inquiry Type *</label>
                  <select
                    value={inquiryForm.type}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, type: e.target.value as typeof inquiryForm.type })}
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg"
                  >
                    <option value="collaboration">Collaboration</option>
                    <option value="feature">Feature Request</option>
                    <option value="record_deal">Record Deal</option>
                    <option value="management">Management</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Message *</label>
                  <textarea
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg h-32"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedTalent(null)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInquiry}
                  disabled={sending || !inquiryForm.name || !inquiryForm.email || !inquiryForm.message}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Inquiry'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
