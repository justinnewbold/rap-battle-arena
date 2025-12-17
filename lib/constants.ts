// Beat styles for Web Audio API generator
export type BeatStyle = 'hiphop' | 'trap' | 'boom' | 'chill' | 'aggressive'

// Demo beats for when no beats are loaded from database
// These use the Web Audio API beat generator (no external URLs needed)
export const DEMO_LIBRARY_BEATS = [
  { id: 'demo-1', name: 'Street Heat', artist: 'BeatMaster', bpm: 90, style: 'hiphop' as BeatStyle, audio_url: null, cover_url: null, duration: 180, is_premium: false },
  { id: 'demo-2', name: 'Night Vibes', artist: 'ProducerX', bpm: 85, style: 'chill' as BeatStyle, audio_url: null, cover_url: null, duration: 200, is_premium: false },
  { id: 'demo-3', name: 'Battle Ready', artist: 'HipHopKing', bpm: 95, style: 'aggressive' as BeatStyle, audio_url: null, cover_url: null, duration: 160, is_premium: false },
  { id: 'demo-4', name: 'Underground Flow', artist: 'BeatMaster', bpm: 88, style: 'trap' as BeatStyle, audio_url: null, cover_url: null, duration: 190, is_premium: false },
  { id: 'demo-5', name: 'Deep Urban', artist: 'UrbanBeats', bpm: 92, style: 'hiphop' as BeatStyle, audio_url: null, cover_url: null, duration: 175, is_premium: false },
  { id: 'demo-6', name: 'Dream State', artist: 'CloudNine', bpm: 78, style: 'chill' as BeatStyle, audio_url: null, cover_url: null, duration: 210, is_premium: false },
  { id: 'demo-7', name: 'Game On', artist: 'TechFlow', bpm: 130, style: 'trap' as BeatStyle, audio_url: null, cover_url: null, duration: 165, is_premium: false },
  { id: 'demo-8', name: 'Lo-Fi Chill', artist: 'ChillMaster', bpm: 75, style: 'boom' as BeatStyle, audio_url: null, cover_url: null, duration: 195, is_premium: false },
] as const

export const DEMO_USER_BEATS = [
  { id: 'my-demo-1', name: 'My Custom Beat', artist: 'You', bpm: 92, style: 'hiphop' as BeatStyle, audio_url: null, cover_url: null, duration: 180, is_premium: false, uploaded_by: 'demo', is_public: false, play_count: 5 },
  { id: 'my-demo-2', name: 'Fire Freestyle', artist: 'You', bpm: 88, style: 'trap' as BeatStyle, audio_url: null, cover_url: null, duration: 200, is_premium: false, uploaded_by: 'demo', is_public: true, play_count: 23 },
] as const

// API rate limits
export const API_RATE_LIMITS = {
  judge: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  transcribe: { maxRequests: 20, windowMs: 60000 }, // 20 requests per minute
  livekit: { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
} as const

// Input validation limits
export const INPUT_LIMITS = {
  transcriptMaxLength: 10000,
  messageMaxLength: 500,
  usernameMaxLength: 30,
  crewNameMaxLength: 50,
  crewTagMaxLength: 4,
} as const
