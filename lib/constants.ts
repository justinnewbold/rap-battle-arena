// Beat styles for Web Audio API generator
// NOTE: Keep in sync with BeatStyle in lib/beat-generator.ts
export type BeatStyle = 'hiphop' | 'trap' | 'boom' | 'chill' | 'aggressive' | 'oldschool' | 'drill' | 'rnb' | 'grime' | 'jersey'

// Demo beats for when no beats are loaded from database
// These use the Web Audio API beat generator (no external URLs needed)
export const DEMO_LIBRARY_BEATS = [
  // Hip-Hop
  { id: 'demo-1', name: 'Street Heat', artist: 'BeatMaster', bpm: 90, style: 'hiphop' as BeatStyle, audio_url: null, cover_url: null, duration: 180, is_premium: false },
  { id: 'demo-2', name: 'Deep Urban', artist: 'UrbanBeats', bpm: 92, style: 'hiphop' as BeatStyle, audio_url: null, cover_url: null, duration: 175, is_premium: false },
  { id: 'demo-3', name: 'Block Party', artist: 'PartyPro', bpm: 94, style: 'hiphop' as BeatStyle, audio_url: null, cover_url: null, duration: 185, is_premium: false },

  // Trap
  { id: 'demo-4', name: 'Underground Flow', artist: 'BeatMaster', bpm: 88, style: 'trap' as BeatStyle, audio_url: null, cover_url: null, duration: 190, is_premium: false },
  { id: 'demo-5', name: 'Game On', artist: 'TechFlow', bpm: 130, style: 'trap' as BeatStyle, audio_url: null, cover_url: null, duration: 165, is_premium: false },
  { id: 'demo-6', name: 'Dark Mode', artist: 'ShadowBeat', bpm: 140, style: 'trap' as BeatStyle, audio_url: null, cover_url: null, duration: 170, is_premium: false },

  // Boom Bap
  { id: 'demo-7', name: 'Lo-Fi Chill', artist: 'ChillMaster', bpm: 75, style: 'boom' as BeatStyle, audio_url: null, cover_url: null, duration: 195, is_premium: false },
  { id: 'demo-8', name: 'Golden Era', artist: 'ClassicKing', bpm: 90, style: 'boom' as BeatStyle, audio_url: null, cover_url: null, duration: 200, is_premium: false },
  { id: 'demo-9', name: 'Dusty Vinyl', artist: 'VinylDigger', bpm: 86, style: 'boom' as BeatStyle, audio_url: null, cover_url: null, duration: 188, is_premium: false },

  // Chill
  { id: 'demo-10', name: 'Night Vibes', artist: 'ProducerX', bpm: 85, style: 'chill' as BeatStyle, audio_url: null, cover_url: null, duration: 200, is_premium: false },
  { id: 'demo-11', name: 'Dream State', artist: 'CloudNine', bpm: 78, style: 'chill' as BeatStyle, audio_url: null, cover_url: null, duration: 210, is_premium: false },
  { id: 'demo-12', name: 'Sunset Drive', artist: 'WaveRider', bpm: 82, style: 'chill' as BeatStyle, audio_url: null, cover_url: null, duration: 205, is_premium: false },

  // Aggressive
  { id: 'demo-13', name: 'Battle Ready', artist: 'HipHopKing', bpm: 95, style: 'aggressive' as BeatStyle, audio_url: null, cover_url: null, duration: 160, is_premium: false },
  { id: 'demo-14', name: 'No Mercy', artist: 'WarDrum', bpm: 100, style: 'aggressive' as BeatStyle, audio_url: null, cover_url: null, duration: 155, is_premium: false },
  { id: 'demo-15', name: 'War Zone', artist: 'Combat', bpm: 110, style: 'aggressive' as BeatStyle, audio_url: null, cover_url: null, duration: 150, is_premium: false },

  // Old School
  { id: 'demo-16', name: 'Classic Break', artist: 'OGBeats', bpm: 96, style: 'oldschool' as BeatStyle, audio_url: null, cover_url: null, duration: 180, is_premium: false },
  { id: 'demo-17', name: '808 Dreams', artist: 'RetroMaster', bpm: 98, style: 'oldschool' as BeatStyle, audio_url: null, cover_url: null, duration: 175, is_premium: false },

  // UK Drill
  { id: 'demo-18', name: 'London Nights', artist: 'UKDriller', bpm: 140, style: 'drill' as BeatStyle, audio_url: null, cover_url: null, duration: 165, is_premium: false },
  { id: 'demo-19', name: 'Cold Streets', artist: 'DrillKing', bpm: 142, style: 'drill' as BeatStyle, audio_url: null, cover_url: null, duration: 160, is_premium: false },

  // R&B
  { id: 'demo-20', name: 'Smooth Operator', artist: 'SilkSound', bpm: 72, style: 'rnb' as BeatStyle, audio_url: null, cover_url: null, duration: 220, is_premium: false },
  { id: 'demo-21', name: 'Late Night', artist: 'MidnightVibes', bpm: 68, style: 'rnb' as BeatStyle, audio_url: null, cover_url: null, duration: 230, is_premium: false },

  // Grime
  { id: 'demo-22', name: 'Eskimo', artist: 'GrimeLord', bpm: 140, style: 'grime' as BeatStyle, audio_url: null, cover_url: null, duration: 168, is_premium: false },
  { id: 'demo-23', name: 'East London', artist: 'EastSide', bpm: 138, style: 'grime' as BeatStyle, audio_url: null, cover_url: null, duration: 172, is_premium: false },

  // Jersey Club
  { id: 'demo-24', name: 'Club Bounce', artist: 'JerseyKid', bpm: 130, style: 'jersey' as BeatStyle, audio_url: null, cover_url: null, duration: 158, is_premium: false },
  { id: 'demo-25', name: 'Jersey Flex', artist: 'ClubMaster', bpm: 135, style: 'jersey' as BeatStyle, audio_url: null, cover_url: null, duration: 162, is_premium: false },
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
