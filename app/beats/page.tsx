'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Music, ArrowLeft, Upload, Play, Pause, Trash2, Plus,
  Globe, Lock, X, Check, Loader2, Clock, Image as ImageIcon
} from 'lucide-react'
import { useUserStore } from '@/lib/store'
import {
  Beat, UserBeat, getUserBeats, getPublicBeats, getBeats,
  uploadBeat, deleteBeat, uploadBeatFile, uploadBeatCover
} from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { SAMPLE_BEATS } from '@/lib/constants'

type TabType = 'my-beats' | 'public' | 'library'

// Demo beats
const DEMO_MY_BEATS: UserBeat[] = [
  {
    id: 'my-1',
    name: 'Summer Vibes',
    artist: 'You',
    bpm: 92,
    audio_url: SAMPLE_BEATS.hiphop1,
    cover_url: null,
    duration: 180,
    is_premium: false,
    uploaded_by: 'demo',
    is_public: true,
    play_count: 45
  },
  {
    id: 'my-2',
    name: 'Midnight Flow',
    artist: 'You',
    bpm: 88,
    audio_url: SAMPLE_BEATS.chill1,
    cover_url: null,
    duration: 200,
    is_premium: false,
    uploaded_by: 'demo',
    is_public: false,
    play_count: 12
  },
]

export default function BeatsPage() {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const [activeTab, setActiveTab] = useState<TabType>('my-beats')
  const [myBeats, setMyBeats] = useState<UserBeat[]>([])
  const [publicBeats, setPublicBeats] = useState<UserBeat[]>([])
  const [libraryBeats, setLibraryBeats] = useState<Beat[]>([])
  const [loading, setLoading] = useState(true)
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadData, setUploadData] = useState({
    name: '',
    artist: '',
    bpm: 90,
    isPublic: false
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    loadBeats()
  }, [user, router])

  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause()
        audioRef.src = ''
      }
    }
  }, [audioRef])

  async function loadBeats() {
    setLoading(true)
    if (isDemo) {
      setMyBeats(DEMO_MY_BEATS)
      setPublicBeats([])
      // Use more demo beats from constants
      setLibraryBeats([
        { id: 'lib-1', name: 'Street Heat', artist: 'BeatMaster', bpm: 90, audio_url: SAMPLE_BEATS.hiphop1, cover_url: null, duration: 180, is_premium: false },
        { id: 'lib-2', name: 'Night Vibes', artist: 'ProducerX', bpm: 85, audio_url: SAMPLE_BEATS.chill1, cover_url: null, duration: 200, is_premium: false },
        { id: 'lib-3', name: 'Battle Ready', artist: 'HipHopKing', bpm: 95, audio_url: SAMPLE_BEATS.hiphop2, cover_url: null, duration: 160, is_premium: false },
        { id: 'lib-4', name: 'Underground Flow', artist: 'BeatMaster', bpm: 88, audio_url: SAMPLE_BEATS.trap1, cover_url: null, duration: 190, is_premium: false },
        { id: 'lib-5', name: 'Deep Urban', artist: 'UrbanBeats', bpm: 92, audio_url: SAMPLE_BEATS.deep1, cover_url: null, duration: 175, is_premium: false },
        { id: 'lib-6', name: 'Dream State', artist: 'CloudNine', bpm: 78, audio_url: SAMPLE_BEATS.dreamy1, cover_url: null, duration: 210, is_premium: false },
        { id: 'lib-7', name: 'Game On', artist: 'TechFlow', bpm: 130, audio_url: SAMPLE_BEATS.gaming1, cover_url: null, duration: 165, is_premium: false },
        { id: 'lib-8', name: 'Lo-Fi Chill', artist: 'ChillMaster', bpm: 75, audio_url: SAMPLE_BEATS.boom1, cover_url: null, duration: 195, is_premium: false },
      ])
    } else {
      const [userBeats, pubBeats, libBeats] = await Promise.all([
        getUserBeats(user!.id),
        getPublicBeats(),
        getBeats()
      ])
      setMyBeats(userBeats)
      setPublicBeats(pubBeats.filter(b => b.uploaded_by !== user!.id))
      setLibraryBeats(libBeats)
    }
    setLoading(false)
  }

  const [audioError, setAudioError] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)

  function toggleBeatPlay(beat: Beat | UserBeat) {
    if (!beat.audio_url) {
      setAudioError('No audio available for this beat')
      setTimeout(() => setAudioError(null), 3000)
      return
    }

    if (playingBeatId === beat.id) {
      if (audioRef) {
        audioRef.pause()
      }
      setPlayingBeatId(null)
      setAudioLoading(false)
    } else {
      if (audioRef) {
        audioRef.pause()
      }
      setAudioLoading(true)
      setAudioError(null)

      const audio = new Audio(beat.audio_url)
      audio.loop = true

      audio.oncanplaythrough = () => {
        setAudioLoading(false)
        audio.play().catch(err => {
          console.error('Playback error:', err)
          setAudioError('Failed to play audio. Please try again.')
          setPlayingBeatId(null)
          setAudioLoading(false)
        })
      }

      audio.onerror = () => {
        setAudioError('Failed to load audio file')
        setPlayingBeatId(null)
        setAudioLoading(false)
      }

      audio.load()
      setAudioRef(audio)
      setPlayingBeatId(beat.id)
    }
  }

  async function handleDeleteBeat(beatId: string) {
    if (!user || isDemo) {
      setMyBeats(prev => prev.filter(b => b.id !== beatId))
      return
    }

    const success = await deleteBeat(beatId, user.id)
    if (success) {
      setMyBeats(prev => prev.filter(b => b.id !== beatId))
    }
  }

  function handleAudioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please select an audio file (MP3, WAV, etc.)')
      return
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size must be less than 20MB')
      return
    }

    setAudioFile(file)
    setUploadError('')

    // Get audio duration
    const audio = new Audio()
    audio.src = URL.createObjectURL(file)
    audio.onloadedmetadata = () => {
      setAudioDuration(Math.round(audio.duration))
    }

    // Auto-fill name from filename
    if (!uploadData.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setUploadData(prev => ({ ...prev, name: nameWithoutExt }))
    }
  }

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Cover image must be less than 5MB')
      return
    }

    setCoverFile(file)
    setUploadError('')
  }

  async function handleUpload() {
    if (!user || !audioFile || !uploadData.name) {
      setUploadError('Please fill in all required fields')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      if (isDemo) {
        // Demo mode - just add to local state
        const newBeat: UserBeat = {
          id: `demo-${Date.now()}`,
          name: uploadData.name,
          artist: uploadData.artist || user.username,
          bpm: uploadData.bpm,
          audio_url: '',
          cover_url: null,
          duration: audioDuration,
          is_premium: false,
          uploaded_by: user.id,
          is_public: uploadData.isPublic,
          play_count: 0
        }
        setMyBeats(prev => [newBeat, ...prev])
        resetUploadModal()
        return
      }

      // Upload audio file
      const audioUrl = await uploadBeatFile(audioFile, user.id)
      if (!audioUrl) {
        throw new Error('Failed to upload audio file')
      }

      // Upload cover if provided
      let coverUrl: string | undefined
      if (coverFile) {
        coverUrl = await uploadBeatCover(coverFile, user.id) || undefined
      }

      // Create beat record
      const beat = await uploadBeat(
        user.id,
        uploadData.name,
        uploadData.artist || user.username,
        uploadData.bpm,
        audioUrl,
        audioDuration,
        coverUrl,
        uploadData.isPublic
      )

      if (beat) {
        setMyBeats(prev => [beat, ...prev])
        resetUploadModal()
      } else {
        throw new Error('Failed to create beat record')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('Failed to upload beat. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function resetUploadModal() {
    setShowUploadModal(false)
    setUploadData({ name: '', artist: '', bpm: 90, isPublic: false })
    setAudioFile(null)
    setCoverFile(null)
    setAudioDuration(0)
    setUploadError('')
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentBeats = activeTab === 'my-beats' ? myBeats :
    activeTab === 'public' ? publicBeats : libraryBeats

  if (!user) return null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-dark-950 to-gold-900/10" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-dark-400 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Music className="w-8 h-8 text-purple-400" />
                Beats
              </h1>
              <p className="text-dark-400 mt-1">Manage your battle beats</p>
            </div>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-fire flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Beat
          </button>
        </div>

        {/* Audio Error Toast */}
        <AnimatePresence>
          {audioError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500/90 text-white rounded-lg shadow-lg flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {audioError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('my-beats')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === 'my-beats'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Music className="w-4 h-4" />
            My Beats
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              activeTab === 'my-beats' ? 'bg-white/20' : 'bg-dark-600'
            )}>
              {myBeats.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === 'public'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Globe className="w-4 h-4" />
            Community
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === 'library'
                ? 'bg-purple-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            )}
          >
            <Music className="w-4 h-4" />
            Library
          </button>
        </div>

        {/* Beats List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentBeats.length > 0 ? (
          <div className="space-y-3">
            {currentBeats.map((beat, index) => (
              <motion.div
                key={beat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="card flex items-center gap-4"
              >
                {/* Cover / Play Button */}
                <button
                  onClick={() => toggleBeatPlay(beat)}
                  disabled={audioLoading && playingBeatId === beat.id}
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all",
                    beat.cover_url ? 'bg-cover bg-center' : 'bg-purple-500/20',
                    playingBeatId === beat.id && 'ring-2 ring-purple-500',
                    !beat.audio_url && 'opacity-50 cursor-not-allowed'
                  )}
                  style={beat.cover_url ? { backgroundImage: `url(${beat.cover_url})` } : {}}
                  title={!beat.audio_url ? 'No audio available' : undefined}
                >
                  {audioLoading && playingBeatId === beat.id ? (
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  ) : playingBeatId === beat.id ? (
                    <Pause className="w-6 h-6 text-purple-400" />
                  ) : (
                    <Play className="w-6 h-6 text-purple-400 ml-1" />
                  )}
                </button>

                {/* Beat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">{beat.name}</h3>
                    {'is_public' in beat && (
                      beat.is_public ? (
                        <Globe className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-dark-500 shrink-0" />
                      )
                    )}
                  </div>
                  <p className="text-sm text-dark-400 truncate">{beat.artist}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-dark-500">
                    <span>{beat.bpm} BPM</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(beat.duration)}
                    </span>
                    {'play_count' in beat && (beat as UserBeat).play_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{(beat as UserBeat).play_count} plays</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {activeTab === 'my-beats' && (
                  <button
                    onClick={() => handleDeleteBeat(beat.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-dark-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Music className="w-16 h-16 mx-auto mb-4 text-dark-600" />
            <h3 className="text-xl font-bold mb-2">
              {activeTab === 'my-beats' ? 'No Beats Yet' :
                activeTab === 'public' ? 'No Community Beats' : 'No Library Beats'}
            </h3>
            <p className="text-dark-400 mb-4">
              {activeTab === 'my-beats'
                ? 'Upload your first beat to use in battles'
                : 'Check back later for more beats'}
            </p>
            {activeTab === 'my-beats' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-fire"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Beat
              </button>
            )}
          </div>
        )}

        {/* Upload Modal */}
        <AnimatePresence>
          {showUploadModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => !uploading && resetUploadModal()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-dark-900 rounded-2xl p-6 max-w-md w-full border border-dark-700 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Upload Beat</h3>
                  <button
                    onClick={() => !uploading && resetUploadModal()}
                    className="p-2 hover:bg-dark-800 rounded-lg"
                    disabled={uploading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Audio File */}
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Audio File *
                    </label>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2",
                        audioFile
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-dark-600 hover:border-purple-500/50 hover:bg-purple-500/5'
                      )}
                    >
                      {audioFile ? (
                        <>
                          <Check className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 truncate">{audioFile.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-dark-400" />
                          <span className="text-dark-400">Select audio file (MP3, WAV)</span>
                        </>
                      )}
                    </button>
                    {audioDuration > 0 && (
                      <p className="text-xs text-dark-500 mt-1">
                        Duration: {formatDuration(audioDuration)}
                      </p>
                    )}
                  </div>

                  {/* Cover Image (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Cover Image (optional)
                    </label>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className={cn(
                        "w-full p-3 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2",
                        coverFile
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-dark-600 hover:border-purple-500/50'
                      )}
                    >
                      {coverFile ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 truncate text-sm">{coverFile.name}</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 text-dark-400" />
                          <span className="text-dark-400 text-sm">Add cover image</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Beat Name */}
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Beat Name *
                    </label>
                    <input
                      type="text"
                      value={uploadData.name}
                      onChange={e => setUploadData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter beat name"
                      className="input w-full"
                    />
                  </div>

                  {/* Artist */}
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Artist/Producer
                    </label>
                    <input
                      type="text"
                      value={uploadData.artist}
                      onChange={e => setUploadData(prev => ({ ...prev, artist: e.target.value }))}
                      placeholder={user?.username || 'Your name'}
                      className="input w-full"
                    />
                  </div>

                  {/* BPM */}
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      BPM
                    </label>
                    <input
                      type="number"
                      value={uploadData.bpm}
                      onChange={e => setUploadData(prev => ({ ...prev, bpm: parseInt(e.target.value) || 90 }))}
                      min={60}
                      max={200}
                      className="input w-full"
                    />
                  </div>

                  {/* Public Toggle */}
                  <div>
                    <button
                      onClick={() => setUploadData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                      className={cn(
                        "w-full p-3 rounded-xl border transition-all flex items-center gap-3",
                        uploadData.isPublic
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-dark-600 hover:border-dark-500'
                      )}
                    >
                      {uploadData.isPublic ? (
                        <Globe className="w-5 h-5 text-green-400" />
                      ) : (
                        <Lock className="w-5 h-5 text-dark-500" />
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-medium">
                          {uploadData.isPublic ? 'Public Beat' : 'Private Beat'}
                        </p>
                        <p className="text-xs text-dark-400">
                          {uploadData.isPublic
                            ? 'Anyone can use this beat in battles'
                            : 'Only you can use this beat'}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Error */}
                  {uploadError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      {uploadError}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !audioFile || !uploadData.name}
                    className="btn-fire w-full flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload Beat
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
