// Sample beat audio URLs (royalty-free samples from Mixkit)
export const SAMPLE_BEATS = {
  hiphop1: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
  hiphop2: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-04-740.mp3',
  trap1: 'https://assets.mixkit.co/music/preview/mixkit-urban-fashion-hip-hop-654.mp3',
  chill1: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3',
  boom1: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
} as const

// Demo beats for when no beats are loaded from database
export const DEMO_LIBRARY_BEATS = [
  { id: 'demo-1', name: 'Street Heat', artist: 'BeatMaster', bpm: 90, audio_url: SAMPLE_BEATS.hiphop1, cover_url: null, duration: 180, is_premium: false },
  { id: 'demo-2', name: 'Night Vibes', artist: 'ProducerX', bpm: 85, audio_url: SAMPLE_BEATS.chill1, cover_url: null, duration: 200, is_premium: false },
  { id: 'demo-3', name: 'Battle Ready', artist: 'HipHopKing', bpm: 95, audio_url: SAMPLE_BEATS.hiphop2, cover_url: null, duration: 160, is_premium: false },
  { id: 'demo-4', name: 'Underground Flow', artist: 'BeatMaster', bpm: 88, audio_url: SAMPLE_BEATS.trap1, cover_url: null, duration: 190, is_premium: true },
] as const

export const DEMO_USER_BEATS = [
  { id: 'my-demo-1', name: 'My Custom Beat', artist: 'You', bpm: 92, audio_url: SAMPLE_BEATS.boom1, cover_url: null, duration: 180, is_premium: false, uploaded_by: 'demo', is_public: false, play_count: 5 },
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
