'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/lib/store'
import {
  getMarketplaceListings,
  getFeaturedListings,
  purchaseBeat,
  BeatListing,
  LICENSE_TYPES
} from '@/lib/content-creation'
import { getUserWallet } from '@/lib/gamification'

export default function MarketplacePage() {
  const { user } = useUserStore()
  const [listings, setListings] = useState<BeatListing[]>([])
  const [featured, setFeatured] = useState<BeatListing[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState<BeatListing | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [filters, setFilters] = useState({
    genre: '',
    minPrice: 0,
    maxPrice: 10000,
    sortBy: 'created_at' as 'price' | 'plays' | 'purchases' | 'created_at'
  })

  const genres = ['Hip Hop', 'Trap', 'Boom Bap', 'Lo-Fi', 'Drill', 'R&B', 'Pop', 'Other']

  useEffect(() => {
    loadData()
  }, [filters])

  useEffect(() => {
    if (user) {
      loadWallet()
    }
  }, [user])

  async function loadData() {
    setLoading(true)
    const [listingsData, featuredData] = await Promise.all([
      getMarketplaceListings({
        genre: filters.genre || undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sortBy: filters.sortBy,
        limit: 50
      }),
      getFeaturedListings(5)
    ])
    setListings(listingsData.listings)
    setFeatured(featuredData)
    setLoading(false)
  }

  async function loadWallet() {
    if (!user) return
    const wallet = await getUserWallet(user.id)
    setWalletBalance(wallet?.balance || 0)
  }

  async function handlePurchase() {
    if (!user || !selectedListing) return
    setPurchasing(true)

    const purchase = await purchaseBeat(selectedListing.id, user.id)
    if (purchase) {
      await loadData()
      await loadWallet()
      setSelectedListing(null)
    }
    setPurchasing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Beat Marketplace</h1>
            <p className="text-gray-400">Discover and purchase beats from talented producers</p>
          </div>
          {user && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Your Balance</div>
              <div className="text-2xl font-bold text-yellow-400">🪙 {walletBalance}</div>
            </div>
          )}
        </div>

        {/* Featured Section */}
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Featured Beats</h2>
            <div className="grid gap-4 md:grid-cols-5">
              {featured.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedListing(listing)}
                  className="cursor-pointer group"
                >
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 p-1">
                    <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                      {listing.beat?.cover_url ? (
                        <img
                          src={listing.beat.cover_url}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">🎵</span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-lg font-bold">🪙 {listing.price_coins}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-2 font-semibold truncate">{listing.title}</h3>
                  <p className="text-sm text-gray-400 truncate">by {listing.seller?.username}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Genre</label>
              <select
                value={filters.genre}
                onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
                className="px-3 py-2 bg-gray-700 rounded-lg text-white"
              >
                <option value="">All Genres</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Min Price</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: parseInt(e.target.value) || 0 })}
                className="w-24 px-3 py-2 bg-gray-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Max Price</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) || 10000 })}
                className="w-24 px-3 py-2 bg-gray-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as typeof filters.sortBy })}
                className="px-3 py-2 bg-gray-700 rounded-lg text-white"
              >
                <option value="created_at">Newest</option>
                <option value="price">Price</option>
                <option value="plays">Most Played</option>
                <option value="purchases">Best Selling</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => setSelectedListing(listing)}
                className="bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                  {listing.beat?.cover_url ? (
                    <img
                      src={listing.beat.cover_url}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">🎵</span>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-xs">
                    {listing.beat?.bpm} BPM
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold truncate">{listing.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{listing.seller?.username}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-yellow-400 font-bold">🪙 {listing.price_coins}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      listing.license_type === 'exclusive' ? 'bg-purple-500/20 text-purple-400' :
                      listing.license_type === 'premium' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {listing.license_type}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span>▶️ {listing.plays}</span>
                    <span>💰 {listing.purchases} sold</span>
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {listing.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}

            {listings.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No beats found matching your filters
              </div>
            )}
          </div>
        )}

        {/* Purchase Modal */}
        {selectedListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedListing(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Beat Preview */}
              <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                {selectedListing.beat?.cover_url ? (
                  <img
                    src={selectedListing.beat.cover_url}
                    alt={selectedListing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">🎵</span>
                )}
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold mb-1">{selectedListing.title}</h2>
                <p className="text-gray-400 mb-4">by {selectedListing.seller?.username}</p>

                <p className="text-gray-300 mb-4">{selectedListing.description}</p>

                {/* Beat Info */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold">{selectedListing.beat?.bpm || '?'}</div>
                    <div className="text-xs text-gray-400">BPM</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold">{selectedListing.plays}</div>
                    <div className="text-xs text-gray-400">Plays</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="text-lg font-bold">{selectedListing.purchases}</div>
                    <div className="text-xs text-gray-400">Sold</div>
                  </div>
                </div>

                {/* License Info */}
                <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="font-bold mb-2 capitalize">{selectedListing.license_type} License</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {LICENSE_TYPES[selectedListing.license_type].rights.map((right, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-green-400">✓</span> {right}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Price and Purchase */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold text-yellow-400">
                      🪙 {selectedListing.price_coins}
                    </div>
                    {selectedListing.price_usd && (
                      <div className="text-sm text-gray-400">
                        or ${selectedListing.price_usd.toFixed(2)} USD
                      </div>
                    )}
                  </div>
                  {user && (
                    <div className="text-right text-sm">
                      <div className="text-gray-400">Your balance</div>
                      <div className={walletBalance >= selectedListing.price_coins ? 'text-green-400' : 'text-red-400'}>
                        🪙 {walletBalance}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedListing(null)}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  {user ? (
                    <button
                      onClick={handlePurchase}
                      disabled={purchasing || walletBalance < selectedListing.price_coins}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {purchasing ? 'Purchasing...' : walletBalance < selectedListing.price_coins ? 'Insufficient Balance' : 'Purchase Beat'}
                    </button>
                  ) : (
                    <button
                      onClick={() => window.location.href = '/login'}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
                    >
                      Sign in to Purchase
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
