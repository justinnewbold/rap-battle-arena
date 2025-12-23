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

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  success: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Battle phase types
export type BattlePhase = 'waiting' | 'countdown' | 'player1' | 'player2' | 'voting' | 'results'

// Scoring categories
export interface ScoreBreakdown {
  rhyme: number
  flow: number
  punchlines: number
  delivery: number
  creativity: number
  rebuttal: number
  total: number
}

export interface JudgingResult {
  scores: ScoreBreakdown
  feedback: string
  highlights: string[]
  improvements: string[]
}

// Matchmaking types
export interface MatchmakingEntry {
  player_id: string
  elo_rating: number
  status: 'searching' | 'matched' | 'cancelled'
  matched_with: string | null
  battle_id: string | null
  created_at: string
  profile?: Profile
}

// Notification types
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

export type NotificationType =
  | 'battle_invite'
  | 'battle_result'
  | 'new_follower'
  | 'crew_invite'
  | 'achievement'
  | 'system'

// Achievement types
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  requirement: number
  reward_elo: number
}

export type AchievementCategory =
  | 'battles'
  | 'wins'
  | 'streak'
  | 'social'
  | 'special'

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  progress: number
  unlocked_at: string | null
  achievement?: Achievement
}

// Crew types
export interface Crew {
  id: string
  name: string
  tag: string
  avatar_url: string | null
  description: string | null
  leader_id: string
  member_count: number
  total_wins: number
  created_at: string
  leader?: Profile
  members?: CrewMember[]
}

export interface CrewMember {
  id: string
  crew_id: string
  user_id: string
  role: 'leader' | 'officer' | 'member'
  joined_at: string
  user?: Profile
}

// Tournament types
export interface Tournament {
  id: string
  name: string
  description: string
  status: 'upcoming' | 'registration' | 'in_progress' | 'completed' | 'cancelled'
  format: 'single_elimination' | 'double_elimination' | 'round_robin'
  max_participants: number
  current_participants: number
  entry_fee: number
  prize_pool: number
  start_date: string
  end_date: string | null
  created_at: string
}

export interface TournamentParticipant {
  id: string
  tournament_id: string
  user_id: string
  seed: number | null
  status: 'registered' | 'active' | 'eliminated' | 'winner'
  registered_at: string
  user?: Profile
}

// ELO Rank types
export interface EloRank {
  name: string
  minElo: number
  maxElo: number
  color: string
  icon: string
}

// Room code types
export interface RoomCodeValidation {
  valid: boolean
  error?: string
}

// Rate limit types
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number
}
