import { BeatStyle, BeatPattern, DemoBeat } from './types'

// Beat patterns for procedural generation
export const BEAT_PATTERNS: BeatPattern[] = [
  // Hip-Hop
  { name: 'Street Heat', bpm: 90, style: 'hiphop' },
  { name: 'Deep Urban', bpm: 92, style: 'hiphop' },
  { name: 'Block Party', bpm: 94, style: 'hiphop' },

  // Trap
  { name: 'Underground Flow', bpm: 88, style: 'trap' },
  { name: 'Game On', bpm: 130, style: 'trap' },
  { name: 'Dark Mode', bpm: 140, style: 'trap' },

  // Boom Bap
  { name: 'Lo-Fi Chill', bpm: 75, style: 'boom' },
  { name: 'Golden Era', bpm: 90, style: 'boom' },
  { name: 'Dusty Vinyl', bpm: 86, style: 'boom' },

  // Chill
  { name: 'Night Vibes', bpm: 85, style: 'chill' },
  { name: 'Dream State', bpm: 78, style: 'chill' },
  { name: 'Sunset Drive', bpm: 82, style: 'chill' },

  // Aggressive
  { name: 'Battle Ready', bpm: 95, style: 'aggressive' },
  { name: 'No Mercy', bpm: 100, style: 'aggressive' },
  { name: 'War Zone', bpm: 110, style: 'aggressive' },

  // Old School
  { name: 'Classic Break', bpm: 96, style: 'oldschool' },
  { name: '808 Dreams', bpm: 98, style: 'oldschool' },

  // UK Drill
  { name: 'London Nights', bpm: 140, style: 'drill' },
  { name: 'Cold Streets', bpm: 142, style: 'drill' },

  // R&B
  { name: 'Smooth Operator', bpm: 72, style: 'rnb' },
  { name: 'Late Night', bpm: 68, style: 'rnb' },

  // Grime
  { name: 'Eskimo', bpm: 140, style: 'grime' },
  { name: 'East London', bpm: 138, style: 'grime' },

  // Jersey Club
  { name: 'Club Bounce', bpm: 130, style: 'jersey' },
  { name: 'Jersey Flex', bpm: 135, style: 'jersey' },
]

// Demo beats for when no beats are loaded from database
export const DEMO_LIBRARY_BEATS: DemoBeat[] = [
  // Hip-Hop
  { id: 'demo-1', name: 'Street Heat', artist: 'BeatMaster', bpm: 90, style: 'hiphop', audio_url: null, cover_url: null, duration: 180, is_premium: false },
  { id: 'demo-2', name: 'Deep Urban', artist: 'UrbanBeats', bpm: 92, style: 'hiphop', audio_url: null, cover_url: null, duration: 175, is_premium: false },
  { id: 'demo-3', name: 'Block Party', artist: 'PartyPro', bpm: 94, style: 'hiphop', audio_url: null, cover_url: null, duration: 185, is_premium: false },

  // Trap
  { id: 'demo-4', name: 'Underground Flow', artist: 'BeatMaster', bpm: 88, style: 'trap', audio_url: null, cover_url: null, duration: 190, is_premium: false },
  { id: 'demo-5', name: 'Game On', artist: 'TechFlow', bpm: 130, style: 'trap', audio_url: null, cover_url: null, duration: 165, is_premium: false },
  { id: 'demo-6', name: 'Dark Mode', artist: 'ShadowBeat', bpm: 140, style: 'trap', audio_url: null, cover_url: null, duration: 170, is_premium: false },

  // Boom Bap
  { id: 'demo-7', name: 'Lo-Fi Chill', artist: 'ChillMaster', bpm: 75, style: 'boom', audio_url: null, cover_url: null, duration: 195, is_premium: false },
  { id: 'demo-8', name: 'Golden Era', artist: 'ClassicKing', bpm: 90, style: 'boom', audio_url: null, cover_url: null, duration: 200, is_premium: false },
  { id: 'demo-9', name: 'Dusty Vinyl', artist: 'VinylDigger', bpm: 86, style: 'boom', audio_url: null, cover_url: null, duration: 188, is_premium: false },

  // Chill
  { id: 'demo-10', name: 'Night Vibes', artist: 'ProducerX', bpm: 85, style: 'chill', audio_url: null, cover_url: null, duration: 200, is_premium: false },
  { id: 'demo-11', name: 'Dream State', artist: 'CloudNine', bpm: 78, style: 'chill', audio_url: null, cover_url: null, duration: 210, is_premium: false },
  { id: 'demo-12', name: 'Sunset Drive', artist: 'WaveRider', bpm: 82, style: 'chill', audio_url: null, cover_url: null, duration: 205, is_premium: false },

  // Aggressive
  { id: 'demo-13', name: 'Battle Ready', artist: 'HipHopKing', bpm: 95, style: 'aggressive', audio_url: null, cover_url: null, duration: 160, is_premium: false },
  { id: 'demo-14', name: 'No Mercy', artist: 'WarDrum', bpm: 100, style: 'aggressive', audio_url: null, cover_url: null, duration: 155, is_premium: false },
  { id: 'demo-15', name: 'War Zone', artist: 'Combat', bpm: 110, style: 'aggressive', audio_url: null, cover_url: null, duration: 150, is_premium: false },

  // Old School
  { id: 'demo-16', name: 'Classic Break', artist: 'OGBeats', bpm: 96, style: 'oldschool', audio_url: null, cover_url: null, duration: 180, is_premium: false },
  { id: 'demo-17', name: '808 Dreams', artist: 'RetroMaster', bpm: 98, style: 'oldschool', audio_url: null, cover_url: null, duration: 175, is_premium: false },

  // UK Drill
  { id: 'demo-18', name: 'London Nights', artist: 'UKDriller', bpm: 140, style: 'drill', audio_url: null, cover_url: null, duration: 165, is_premium: false },
  { id: 'demo-19', name: 'Cold Streets', artist: 'DrillKing', bpm: 142, style: 'drill', audio_url: null, cover_url: null, duration: 160, is_premium: false },

  // R&B
  { id: 'demo-20', name: 'Smooth Operator', artist: 'SilkSound', bpm: 72, style: 'rnb', audio_url: null, cover_url: null, duration: 220, is_premium: false },
  { id: 'demo-21', name: 'Late Night', artist: 'MidnightVibes', bpm: 68, style: 'rnb', audio_url: null, cover_url: null, duration: 230, is_premium: false },

  // Grime
  { id: 'demo-22', name: 'Eskimo', artist: 'GrimeLord', bpm: 140, style: 'grime', audio_url: null, cover_url: null, duration: 168, is_premium: false },
  { id: 'demo-23', name: 'East London', artist: 'EastSide', bpm: 138, style: 'grime', audio_url: null, cover_url: null, duration: 172, is_premium: false },

  // Jersey Club
  { id: 'demo-24', name: 'Club Bounce', artist: 'JerseyKid', bpm: 130, style: 'jersey', audio_url: null, cover_url: null, duration: 158, is_premium: false },
  { id: 'demo-25', name: 'Jersey Flex', artist: 'ClubMaster', bpm: 135, style: 'jersey', audio_url: null, cover_url: null, duration: 162, is_premium: false },
]

// Drum patterns for each style (16 steps: kick, snare, hihat, 808)
export const DRUM_PATTERNS: Record<BeatStyle, number[][]> = {
  hiphop: [
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  ],
  trap: [
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  ],
  boom: [
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  chill: [
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  aggressive: [
    [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
  ],
  oldschool: [
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  ],
  drill: [
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  ],
  rnb: [
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  grime: [
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  ],
  jersey: [
    [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
}

// Battle settings
export const ROUND_DURATION = 60 // seconds
export const COUNTDOWN_DURATION = 3

// Input validation limits
export const INPUT_LIMITS = {
  transcriptMaxLength: 10000,
  messageMaxLength: 500,
  usernameMaxLength: 30,
  crewNameMaxLength: 50,
  crewTagMaxLength: 4,
}
