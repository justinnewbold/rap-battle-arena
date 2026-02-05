import { supabase, Profile, BattleRound } from './supabase'

// AI Opponent Types
export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legendary'
export type AIPersonality = 'aggressive' | 'technical' | 'humorous' | 'storyteller' | 'freestyler'

export interface AIOpponent {
  id: string
  name: string
  avatar_url: string
  difficulty: AIDifficulty
  personality: AIPersonality
  description: string
  base_elo: number
  voice_id: string | null // For voice cloning/TTS
  style_traits: string[]
  catchphrases: string[]
  is_unlocked_by_default: boolean
  unlock_cost: number // Battle coins
  created_at: string
}

export interface AIBattle {
  id: string
  user_id: string
  ai_opponent_id: string
  status: 'in_progress' | 'complete'
  user_total_score: number
  ai_total_score: number
  winner: 'user' | 'ai' | null
  current_round: number
  total_rounds: number
  created_at: string
  completed_at: string | null
  // Joined
  ai_opponent?: AIOpponent
}

export interface AIBattleRound {
  id: string
  ai_battle_id: string
  round_number: number
  turn: 'user' | 'ai'
  transcript: string | null
  audio_url: string | null
  score: number | null
  feedback: string | null
  created_at: string
}

// AI Opponent configurations
export const AI_OPPONENTS: Omit<AIOpponent, 'id' | 'created_at'>[] = [
  {
    name: 'MC Rookie',
    avatar_url: '/avatars/ai/rookie.png',
    difficulty: 'beginner',
    personality: 'freestyler',
    description: 'A beginner AI perfect for warming up. Takes it easy but still brings some bars.',
    base_elo: 800,
    voice_id: null,
    style_traits: ['simple rhymes', 'basic flow', 'encouraging'],
    catchphrases: ['Let\'s have some fun!', 'Good try, keep going!'],
    is_unlocked_by_default: true,
    unlock_cost: 0
  },
  {
    name: 'Flow Master',
    avatar_url: '/avatars/ai/flow-master.png',
    difficulty: 'intermediate',
    personality: 'technical',
    description: 'Focuses on complex rhyme schemes and multisyllabic patterns.',
    base_elo: 1100,
    voice_id: null,
    style_traits: ['multisyllabic rhymes', 'internal rhymes', 'smooth delivery'],
    catchphrases: ['Watch the flow!', 'Syllables stacking!'],
    is_unlocked_by_default: true,
    unlock_cost: 0
  },
  {
    name: 'Punchline Pete',
    avatar_url: '/avatars/ai/punchline.png',
    difficulty: 'intermediate',
    personality: 'humorous',
    description: 'Master of wordplay and punchlines. Will make the crowd laugh while destroying you.',
    base_elo: 1200,
    voice_id: null,
    style_traits: ['wordplay', 'double entendres', 'crowd interaction'],
    catchphrases: ['Did you catch that?', 'Bar after bar!'],
    is_unlocked_by_default: false,
    unlock_cost: 100
  },
  {
    name: 'Aggressive Anna',
    avatar_url: '/avatars/ai/aggressive.png',
    difficulty: 'advanced',
    personality: 'aggressive',
    description: 'No holds barred. Comes with heavy disses and relentless pressure.',
    base_elo: 1400,
    voice_id: null,
    style_traits: ['hard hitting', 'personal attacks', 'intimidating presence'],
    catchphrases: ['You\'re not ready!', 'Too easy!'],
    is_unlocked_by_default: false,
    unlock_cost: 250
  },
  {
    name: 'Story Slinger',
    avatar_url: '/avatars/ai/storyteller.png',
    difficulty: 'advanced',
    personality: 'storyteller',
    description: 'Weaves narratives into bars, creating vivid imagery and emotional impact.',
    base_elo: 1500,
    voice_id: null,
    style_traits: ['narrative structure', 'vivid imagery', 'emotional depth'],
    catchphrases: ['Let me paint a picture...', 'Follow the story!'],
    is_unlocked_by_default: false,
    unlock_cost: 300
  },
  {
    name: 'The Architect',
    avatar_url: '/avatars/ai/architect.png',
    difficulty: 'expert',
    personality: 'technical',
    description: 'Combines all styles with perfect execution. A true test of skill.',
    base_elo: 1800,
    voice_id: null,
    style_traits: ['all techniques', 'perfect timing', 'adaptive strategy'],
    catchphrases: ['Calculated destruction.', 'Every syllable counts.'],
    is_unlocked_by_default: false,
    unlock_cost: 500
  },
  {
    name: 'Legendary MC',
    avatar_url: '/avatars/ai/legendary.png',
    difficulty: 'legendary',
    personality: 'aggressive',
    description: 'The ultimate challenge. Only the best can hope to compete.',
    base_elo: 2200,
    voice_id: null,
    style_traits: ['unpredictable', 'devastating', 'crowd favorite'],
    catchphrases: ['You dare challenge a legend?', 'History in the making!'],
    is_unlocked_by_default: false,
    unlock_cost: 1000
  }
]

// Get all AI opponents
export async function getAIOpponents(): Promise<AIOpponent[]> {
  const { data, error } = await supabase
    .from('ai_opponents')
    .select('*')
    .order('base_elo', { ascending: true })

  if (error) {
    console.error('Error fetching AI opponents:', error)
    return []
  }
  return data || []
}

// Get user's unlocked AI opponents
export async function getUserUnlockedOpponents(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_ai_unlocks')
    .select('ai_opponent_id')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching unlocked opponents:', error)
    return []
  }
  return data?.map(d => d.ai_opponent_id) || []
}

// Unlock AI opponent
export async function unlockAIOpponent(userId: string, opponentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_ai_unlocks')
    .insert({
      user_id: userId,
      ai_opponent_id: opponentId
    })

  if (error) {
    console.error('Error unlocking opponent:', error)
    return false
  }
  return true
}

// Start AI battle
export async function startAIBattle(userId: string, opponentId: string, totalRounds: number = 3): Promise<AIBattle | null> {
  const { data, error } = await supabase
    .from('ai_battles')
    .insert({
      user_id: userId,
      ai_opponent_id: opponentId,
      status: 'in_progress',
      total_rounds: totalRounds,
      current_round: 1,
      user_total_score: 0,
      ai_total_score: 0
    })
    .select('*, ai_opponent:ai_opponents(*)')
    .single()

  if (error) {
    console.error('Error starting AI battle:', error)
    return null
  }
  return data
}

// Get AI battle
export async function getAIBattle(battleId: string): Promise<AIBattle | null> {
  const { data, error } = await supabase
    .from('ai_battles')
    .select('*, ai_opponent:ai_opponents(*)')
    .eq('id', battleId)
    .single()

  if (error) {
    console.error('Error fetching AI battle:', error)
    return null
  }
  return data
}

// Submit user round in AI battle
export async function submitUserRound(
  battleId: string,
  roundNumber: number,
  transcript: string,
  audioUrl: string | null,
  score: number,
  feedback: string
): Promise<AIBattleRound | null> {
  const { data, error } = await supabase
    .from('ai_battle_rounds')
    .insert({
      ai_battle_id: battleId,
      round_number: roundNumber,
      turn: 'user',
      transcript,
      audio_url: audioUrl,
      score,
      feedback
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting user round:', error)
    return null
  }

  // Update battle score
  await supabase.rpc('update_ai_battle_user_score', {
    p_battle_id: battleId,
    p_score: score
  })

  return data
}

// Generate AI response based on opponent personality and difficulty
export function generateAIPrompt(
  opponent: AIOpponent,
  userTranscript: string,
  roundNumber: number,
  battleContext: string
): string {
  const difficultyModifiers = {
    beginner: 'Use simple vocabulary and basic rhyme schemes. Be encouraging.',
    intermediate: 'Use moderate complexity with some multisyllabic rhymes.',
    advanced: 'Use complex rhyme schemes, wordplay, and strong rebuttals.',
    expert: 'Use highly technical flows, perfect timing, and devastating punchlines.',
    legendary: 'Use the most sophisticated techniques, unpredictable patterns, and legendary bars.'
  }

  const personalityStyles = {
    aggressive: 'Be confrontational, use personal attacks, show dominance.',
    technical: 'Focus on rhyme complexity, flow patterns, and lyrical technique.',
    humorous: 'Use wordplay, jokes, double meanings, and crowd-pleasing bars.',
    storyteller: 'Weave narratives, create imagery, build emotional impact.',
    freestyler: 'Be spontaneous, reference surroundings, adapt to the moment.'
  }

  return `You are ${opponent.name}, a rap battle AI opponent.

PERSONALITY: ${opponent.personality}
DIFFICULTY: ${opponent.difficulty}
STYLE: ${personalityStyles[opponent.personality]}
COMPLEXITY: ${difficultyModifiers[opponent.difficulty]}

TRAITS: ${opponent.style_traits.join(', ')}
CATCHPHRASES (use occasionally): ${opponent.catchphrases.join(', ')}

CONTEXT: Round ${roundNumber} of a rap battle.
${battleContext}

OPPONENT'S VERSE:
${userTranscript}

Generate a rap verse response (8-16 bars) that:
1. Directly responds to and rebuts specific lines from the opponent
2. Matches your personality and difficulty level
3. Uses your style traits
4. Ends with a strong punchline

Return ONLY the verse, no explanations.`
}

// Style Analysis Types
export interface StyleAnalysis {
  id: string
  user_id: string
  analysis_date: string
  total_battles_analyzed: number

  // Core metrics
  rhyme_complexity_avg: number
  flow_consistency_avg: number
  punchline_effectiveness_avg: number
  delivery_score_avg: number
  creativity_score_avg: number
  rebuttal_skill_avg: number

  // Style traits
  dominant_style: string
  secondary_style: string | null
  vocabulary_richness: number
  average_verse_length: number
  multisyllabic_percentage: number

  // Patterns
  common_rhyme_schemes: string[]
  favorite_topics: string[]
  improvement_areas: string[]
  strengths: string[]

  // Comparison
  percentile_overall: number
  percentile_in_tier: number

  created_at: string
}

// Get user's style analysis
export async function getStyleAnalysis(userId: string): Promise<StyleAnalysis | null> {
  const { data, error } = await supabase
    .from('style_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('analysis_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return null
  }
  return data
}

// Generate style analysis from battle history
export async function generateStyleAnalysis(userId: string): Promise<StyleAnalysis | null> {
  // Get user's battle rounds
  const { data: rounds, error } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('player_id', userId)
    .order('created_at', { ascending: false })
    .limit(100) // Analyze last 100 rounds

  if (error || !rounds || rounds.length < 5) {
    console.error('Not enough data for analysis')
    return null
  }

  // Calculate averages
  const avgRhyme = rounds.reduce((sum, r) => sum + (r.rhyme_score || 0), 0) / rounds.length
  const avgFlow = rounds.reduce((sum, r) => sum + (r.flow_score || 0), 0) / rounds.length
  const avgPunchlines = rounds.reduce((sum, r) => sum + (r.punchlines_score || 0), 0) / rounds.length
  const avgDelivery = rounds.reduce((sum, r) => sum + (r.delivery_score || 0), 0) / rounds.length
  const avgCreativity = rounds.reduce((sum, r) => sum + (r.creativity_score || 0), 0) / rounds.length
  const avgRebuttal = rounds.reduce((sum, r) => sum + (r.rebuttal_score || 0), 0) / rounds.length

  // Determine dominant style based on highest scores
  const styles = [
    { name: 'Technical', score: avgRhyme + avgFlow },
    { name: 'Punchline Heavy', score: avgPunchlines * 2 },
    { name: 'Creative', score: avgCreativity * 2 },
    { name: 'Battle Ready', score: avgRebuttal * 2 },
    { name: 'Performance Focused', score: avgDelivery * 2 }
  ].sort((a, b) => b.score - a.score)

  const dominantStyle = styles[0].name
  const secondaryStyle = styles[1].score > styles[0].score * 0.8 ? styles[1].name : null

  // Identify strengths and areas for improvement
  const scores = [
    { name: 'Rhyme Complexity', score: avgRhyme },
    { name: 'Flow & Rhythm', score: avgFlow },
    { name: 'Punchlines', score: avgPunchlines },
    { name: 'Delivery', score: avgDelivery },
    { name: 'Creativity', score: avgCreativity },
    { name: 'Rebuttals', score: avgRebuttal }
  ]

  const sortedScores = [...scores].sort((a, b) => b.score - a.score)
  const strengths = sortedScores.slice(0, 2).map(s => s.name)
  const improvementAreas = sortedScores.slice(-2).map(s => s.name)

  // Insert analysis
  const { data, error: insertError } = await supabase
    .from('style_analyses')
    .insert({
      user_id: userId,
      analysis_date: new Date().toISOString(),
      total_battles_analyzed: rounds.length,
      rhyme_complexity_avg: avgRhyme,
      flow_consistency_avg: avgFlow,
      punchline_effectiveness_avg: avgPunchlines,
      delivery_score_avg: avgDelivery,
      creativity_score_avg: avgCreativity,
      rebuttal_skill_avg: avgRebuttal,
      dominant_style: dominantStyle,
      secondary_style: secondaryStyle,
      vocabulary_richness: 0.7, // Would need NLP analysis
      average_verse_length: 12, // Would calculate from transcripts
      multisyllabic_percentage: 0.3, // Would need NLP analysis
      common_rhyme_schemes: ['AABB', 'ABAB'],
      favorite_topics: ['competition', 'skill', 'victory'],
      improvement_areas: improvementAreas,
      strengths,
      percentile_overall: 50, // Would calculate from all users
      percentile_in_tier: 50
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating analysis:', insertError)
    return null
  }
  return data
}

// Personalized Improvement Suggestions
export interface ImprovementSuggestion {
  category: string
  title: string
  description: string
  exercises: string[]
  priority: 'high' | 'medium' | 'low'
  estimatedImpact: number // 1-10
}

export function generateImprovementSuggestions(analysis: StyleAnalysis): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = []

  // Rhyme complexity suggestions
  if (analysis.rhyme_complexity_avg < 70) {
    suggestions.push({
      category: 'Rhyme Complexity',
      title: 'Level Up Your Rhyme Schemes',
      description: 'Your rhymes are solid but could use more complexity to stand out.',
      exercises: [
        'Practice multisyllabic rhymes: "magnificent" / "African descent"',
        'Study Eminem\'s rhyme patterns in "Lose Yourself"',
        'Try internal rhyming within lines',
        'Create a rhyme chain of 5+ connected words'
      ],
      priority: analysis.rhyme_complexity_avg < 50 ? 'high' : 'medium',
      estimatedImpact: 8
    })
  }

  // Flow suggestions
  if (analysis.flow_consistency_avg < 70) {
    suggestions.push({
      category: 'Flow & Rhythm',
      title: 'Smooth Out Your Flow',
      description: 'Work on staying on beat and varying your cadence.',
      exercises: [
        'Practice rapping over different BPM beats',
        'Record yourself and identify where you go off-beat',
        'Try double-time and half-time switching',
        'Study different flow patterns from various artists'
      ],
      priority: analysis.flow_consistency_avg < 50 ? 'high' : 'medium',
      estimatedImpact: 9
    })
  }

  // Punchline suggestions
  if (analysis.punchline_effectiveness_avg < 70) {
    suggestions.push({
      category: 'Punchlines',
      title: 'Sharpen Your Punchlines',
      description: 'Your bars need more impactful endings that hit hard.',
      exercises: [
        'Write 10 punchlines using wordplay',
        'Study battle rap highlights for setup/punchline structure',
        'Practice double entendres',
        'Work on timing - pause before the punch for impact'
      ],
      priority: analysis.punchline_effectiveness_avg < 50 ? 'high' : 'medium',
      estimatedImpact: 8
    })
  }

  // Rebuttal suggestions
  if (analysis.rebuttal_skill_avg < 70) {
    suggestions.push({
      category: 'Rebuttals',
      title: 'Improve Your Rebuttals',
      description: 'Learn to flip your opponent\'s bars against them.',
      exercises: [
        'Watch battle rap and note rebuttal techniques',
        'Practice "flipping" - taking opponent\'s words and using them against them',
        'Develop quick thinking with freestyle exercises',
        'Listen actively during opponent\'s verse for rebuttal opportunities'
      ],
      priority: analysis.rebuttal_skill_avg < 50 ? 'high' : 'medium',
      estimatedImpact: 7
    })
  }

  // Creativity suggestions
  if (analysis.creativity_score_avg < 70) {
    suggestions.push({
      category: 'Creativity',
      title: 'Boost Your Creativity',
      description: 'Bring more unique angles and unexpected content to your verses.',
      exercises: [
        'Write about unusual topics to break patterns',
        'Create metaphor chains (extended metaphors)',
        'Study poets and spoken word artists',
        'Practice freestyling about random objects'
      ],
      priority: 'medium',
      estimatedImpact: 6
    })
  }

  // Sort by priority and impact
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return b.estimatedImpact - a.estimatedImpact
  })
}

// Voice Cloning Types (for custom AI opponents)
export interface CustomVoice {
  id: string
  user_id: string
  name: string
  description: string | null
  voice_model_id: string // External TTS service ID
  sample_audio_urls: string[]
  status: 'processing' | 'ready' | 'failed'
  created_at: string
}

export interface CustomAIOpponent {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  personality: AIPersonality
  difficulty: AIDifficulty
  custom_voice_id: string | null
  custom_style_prompt: string
  is_public: boolean
  use_count: number
  created_at: string
  // Joined
  voice?: CustomVoice
}

// Get user's custom AI opponents
export async function getUserCustomOpponents(userId: string): Promise<CustomAIOpponent[]> {
  const { data, error } = await supabase
    .from('custom_ai_opponents')
    .select('*, voice:custom_voices(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching custom opponents:', error)
    return []
  }
  return data || []
}

// Create custom AI opponent
export async function createCustomOpponent(
  userId: string,
  name: string,
  personality: AIPersonality,
  difficulty: AIDifficulty,
  stylePrompt: string,
  avatarUrl?: string,
  voiceId?: string,
  isPublic: boolean = false
): Promise<CustomAIOpponent | null> {
  const { data, error } = await supabase
    .from('custom_ai_opponents')
    .insert({
      user_id: userId,
      name,
      avatar_url: avatarUrl || null,
      personality,
      difficulty,
      custom_voice_id: voiceId || null,
      custom_style_prompt: stylePrompt,
      is_public: isPublic
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating custom opponent:', error)
    return null
  }
  return data
}

// Get public custom opponents
export async function getPublicCustomOpponents(limit: number = 20): Promise<CustomAIOpponent[]> {
  const { data, error } = await supabase
    .from('custom_ai_opponents')
    .select('*, voice:custom_voices(*)')
    .eq('is_public', true)
    .order('use_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching public opponents:', error)
    return []
  }
  return data || []
}

// Training Mode with AI Coach
export interface TrainingSession {
  id: string
  user_id: string
  focus_area: string // rhymes, flow, punchlines, etc.
  difficulty: AIDifficulty
  duration_minutes: number
  exercises_completed: number
  score: number
  feedback: string
  created_at: string
  completed_at: string | null
}

export interface TrainingExercise {
  id: string
  name: string
  description: string
  focus_area: string
  difficulty: AIDifficulty
  instructions: string[]
  example: string
  success_criteria: string
  points: number
}

// Pre-defined training exercises
export const TRAINING_EXERCISES: Omit<TrainingExercise, 'id'>[] = [
  {
    name: 'Rhyme Chain Challenge',
    description: 'Create a chain of words that all rhyme together.',
    focus_area: 'rhymes',
    difficulty: 'beginner',
    instructions: [
      'Start with the word provided',
      'Add 5 more words that rhyme',
      'Try to include at least one multisyllabic rhyme'
    ],
    example: 'Flow → know → show → below → overthrow → status quo',
    success_criteria: 'At least 5 valid rhymes with variety',
    points: 10
  },
  {
    name: 'Beat Riding',
    description: 'Stay perfectly on beat for a full verse.',
    focus_area: 'flow',
    difficulty: 'intermediate',
    instructions: [
      'Listen to the beat for 4 bars',
      'Freestyle for 8 bars without going off-beat',
      'Maintain consistent syllable count per bar'
    ],
    example: 'Each bar should hit on the 1, 2, 3, 4 counts',
    success_criteria: 'No off-beat moments, smooth transitions',
    points: 20
  },
  {
    name: 'Punchline Workshop',
    description: 'Write devastating punchlines using wordplay.',
    focus_area: 'punchlines',
    difficulty: 'intermediate',
    instructions: [
      'Read the setup line provided',
      'Write 3 different punchline endings',
      'Each should use a different technique (double meaning, flip, metaphor)'
    ],
    example: 'Setup: "They say I can\'t make it..." → Punch: "...but I\'m already here, making history while you\'re still waiting"',
    success_criteria: 'Clear setup/punch structure with impact',
    points: 25
  },
  {
    name: 'Rebuttal Training',
    description: 'Practice flipping opponent bars instantly.',
    focus_area: 'rebuttals',
    difficulty: 'advanced',
    instructions: [
      'Listen to the AI opponent\'s verse',
      'Identify 2-3 key phrases to flip',
      'Construct rebuttals that use their words against them'
    ],
    example: 'If they say "I\'m the king", flip to "You\'re a king? More like a court jester"',
    success_criteria: 'Direct references to opponent\'s content',
    points: 30
  },
  {
    name: 'Extended Metaphor',
    description: 'Build an entire verse around one metaphor.',
    focus_area: 'creativity',
    difficulty: 'advanced',
    instructions: [
      'Choose a theme (sports, war, nature, etc.)',
      'Write 8 bars using only that metaphor',
      'Make every line connect to the theme'
    ],
    example: 'Chess theme: "I\'m the queen on this board, moving any direction..."',
    success_criteria: 'Consistent metaphor throughout with creative applications',
    points: 35
  }
]

// Start a training session
export async function startTrainingSession(
  userId: string,
  focusArea: string,
  difficulty: AIDifficulty,
  durationMinutes: number
): Promise<TrainingSession | null> {
  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      user_id: userId,
      focus_area: focusArea,
      difficulty,
      duration_minutes: durationMinutes,
      exercises_completed: 0,
      score: 0
    })
    .select()
    .single()

  if (error) {
    console.error('Error starting training session:', error)
    return null
  }
  return data
}

// Complete training session
export async function completeTrainingSession(
  sessionId: string,
  exercisesCompleted: number,
  score: number,
  feedback: string
): Promise<TrainingSession | null> {
  const { data, error } = await supabase
    .from('training_sessions')
    .update({
      exercises_completed: exercisesCompleted,
      score,
      feedback,
      completed_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error completing training session:', error)
    return null
  }
  return data
}

// Get user's training history
export async function getTrainingHistory(userId: string, limit: number = 20): Promise<TrainingSession[]> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching training history:', error)
    return []
  }
  return data || []
}

// Generate AI coaching feedback
export function generateCoachingFeedback(
  transcript: string,
  focusArea: string,
  scores: { rhyme: number; flow: number; punchlines: number; delivery: number; creativity: number }
): string {
  const weakestArea = Object.entries(scores).sort(([,a], [,b]) => a - b)[0]
  const strongestArea = Object.entries(scores).sort(([,a], [,b]) => b - a)[0]

  let feedback = `Great effort! Your ${strongestArea[0]} really stood out with a score of ${strongestArea[1]}/100. `

  if (weakestArea[1] < 60) {
    feedback += `\n\nArea to focus on: ${weakestArea[0]} (${weakestArea[1]}/100). `

    const tips: Record<string, string> = {
      rhyme: 'Try incorporating more multisyllabic rhymes and internal rhyme patterns.',
      flow: 'Work on maintaining consistent timing. Try tapping the beat while rapping.',
      punchlines: 'Build up your setups more before delivering the punch. The contrast creates impact.',
      delivery: 'Project more confidence. Vary your tone and emphasis for key moments.',
      creativity: 'Bring more unique perspectives. What can only YOU say about this topic?'
    }

    feedback += tips[weakestArea[0]] || 'Keep practicing this area consistently.'
  }

  return feedback
}
