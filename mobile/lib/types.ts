// Shared types for web and mobile apps

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  elo_rating: number
  wins: number
  losses: number
  total_battles: number
  created_at: string
  updated_at: string
}

export interface Beat {
  id: string
  name: string
  artist: string
  bpm: number
  audio_url: string
  cover_url: string | null
  duration: number
  is_premium: boolean
}

export interface Battle {
  id: string
  room_code: string
  status: 'waiting' | 'ready' | 'battling' | 'judging' | 'complete' | 'cancelled'
  player1_id: string
  player2_id: string | null
  winner_id: string | null
  current_round: number
  total_rounds: number
  beat_id: string | null
  player1_total_score: number | null
  player2_total_score: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  voting_style: 'per_round' | 'overall'
  show_votes_during_battle: boolean
  player1?: Profile
  player2?: Profile
  beat?: Beat
  spectators?: Spectator[]
  votes?: Vote[]
}

export interface Spectator {
  id: string
  battle_id: string
  user_id: string
  joined_at: string
  user?: Profile
}

export interface Vote {
  id: string
  battle_id: string
  voter_id: string
  voted_for_player_id: string
  round_number: number | null
  created_at: string
  voter?: Profile
}

export interface BattleRound {
  id: string
  battle_id: string
  round_number: number
  player_id: string
  audio_url: string | null
  transcript: string | null
  duration: number | null
  rhyme_score: number | null
  flow_score: number | null
  punchlines_score: number | null
  delivery_score: number | null
  creativity_score: number | null
  rebuttal_score: number | null
  total_score: number | null
  judge_feedback: string | null
  ai_model_used: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  battle_id: string
  user_id: string
  message: string
  created_at: string
  user?: {
    id: string
    username: string
    avatar_url: string | null
  }
}

export interface VoteCounts {
  player1Votes: number
  player2Votes: number
  totalVotes: number
}

// Beat generator types
export type BeatStyle = 'hiphop' | 'trap' | 'boom' | 'chill' | 'aggressive' | 'oldschool' | 'drill' | 'rnb' | 'grime' | 'jersey'

export interface BeatPattern {
  name: string
  bpm: number
  style: BeatStyle
}

export interface DemoBeat {
  id: string
  name: string
  artist: string
  bpm: number
  style: BeatStyle
  audio_url: string | null
  cover_url: string | null
  duration: number
  is_premium: boolean
}
