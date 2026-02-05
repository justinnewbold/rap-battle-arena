// Analytics & Insights Features
// Heat Maps, Word Cloud, Opponent Scouting, Progress Reports, Stats Comparison

import { supabase, Profile, Battle, BattleRound } from './supabase'

// ===========================================
// HEAT MAPS - Verse Analysis
// ===========================================

export interface VerseHeatMap {
  battleId: string
  roundNumber: number
  playerId: string
  transcript: string
  segments: HeatMapSegment[]
  overallScore: number
  peakMoments: PeakMoment[]
}

export interface HeatMapSegment {
  startIndex: number
  endIndex: number
  text: string
  scores: {
    rhyme: number
    flow: number
    impact: number
    creativity: number
  }
  combinedScore: number
  color: string // Hex color based on score
}

export interface PeakMoment {
  segmentIndex: number
  text: string
  score: number
  type: 'punchline' | 'rhyme_chain' | 'flow_switch' | 'crowd_reaction'
}

// Generate heat map for a verse
export async function generateVerseHeatMap(
  battleId: string,
  roundNumber: number,
  playerId: string
): Promise<VerseHeatMap | null> {
  // Get the round data
  const { data: round } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('battle_id', battleId)
    .eq('round_number', roundNumber)
    .eq('player_id', playerId)
    .single()

  if (!round || !round.transcript) return null

  // Split transcript into segments (roughly by bars/sentences)
  const sentences = round.transcript.split(/[.!?\n]+/).filter(s => s.trim())
  const segments: HeatMapSegment[] = []

  let currentIndex = 0
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    const startIndex = round.transcript.indexOf(trimmed, currentIndex)
    const endIndex = startIndex + trimmed.length

    // Analyze segment (simplified - would use AI in production)
    const scores = analyzeSegment(trimmed)
    const combinedScore = (scores.rhyme + scores.flow + scores.impact + scores.creativity) / 4

    segments.push({
      startIndex,
      endIndex,
      text: trimmed,
      scores,
      combinedScore,
      color: getHeatMapColor(combinedScore)
    })

    currentIndex = endIndex
  }

  // Find peak moments
  const peakMoments = findPeakMoments(segments)

  return {
    battleId,
    roundNumber,
    playerId,
    transcript: round.transcript,
    segments,
    overallScore: round.total_score || 0,
    peakMoments
  }
}

// Analyze a segment of text
function analyzeSegment(text: string): HeatMapSegment['scores'] {
  const words = text.toLowerCase().split(/\s+/)

  // Simple heuristics (would be AI-powered in production)
  const rhymeScore = detectRhymes(words) * 100
  const flowScore = Math.min(100, words.length * 5 + Math.random() * 30)
  const impactScore = detectPunchlines(text) ? 80 + Math.random() * 20 : 40 + Math.random() * 30
  const creativityScore = detectCreativity(text) * 100

  return {
    rhyme: Math.min(100, rhymeScore),
    flow: Math.min(100, flowScore),
    impact: Math.min(100, impactScore),
    creativity: Math.min(100, creativityScore)
  }
}

// Simple rhyme detection
function detectRhymes(words: string[]): number {
  if (words.length < 2) return 0.3

  let rhymeCount = 0
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1].slice(-2)
    const curr = words[i].slice(-2)
    if (prev === curr && prev.length >= 2) {
      rhymeCount++
    }
  }

  return Math.min(1, rhymeCount / (words.length / 4) + 0.3)
}

// Simple punchline detection
function detectPunchlines(text: string): boolean {
  const punchlineIndicators = [
    /\b(like|than)\b.*\b(but|though)\b/i,
    /\?.*!/,
    /\b(call|they call)\b/i,
    /\b(so|too)\b.*\b(that|even)\b/i
  ]

  return punchlineIndicators.some(pattern => pattern.test(text))
}

// Simple creativity detection
function detectCreativity(text: string): number {
  const creativeIndicators = [
    /metaphor|like a|as a/i,
    /imagine|picture/i,
    /\b(never|nobody|nothing)\b.*\b(ever|before)\b/i
  ]

  let score = 0.4
  for (const pattern of creativeIndicators) {
    if (pattern.test(text)) score += 0.2
  }

  return Math.min(1, score)
}

// Get color based on score
function getHeatMapColor(score: number): string {
  if (score >= 90) return '#22c55e' // Green - excellent
  if (score >= 75) return '#84cc16' // Lime - great
  if (score >= 60) return '#eab308' // Yellow - good
  if (score >= 45) return '#f97316' // Orange - average
  return '#ef4444' // Red - needs work
}

// Find peak moments in segments
function findPeakMoments(segments: HeatMapSegment[]): PeakMoment[] {
  const peaks: PeakMoment[] = []

  segments.forEach((segment, index) => {
    if (segment.combinedScore >= 75) {
      let type: PeakMoment['type'] = 'punchline'

      if (segment.scores.rhyme >= 85) type = 'rhyme_chain'
      else if (segment.scores.flow >= 85) type = 'flow_switch'
      else if (segment.scores.impact >= 85) type = 'crowd_reaction'

      peaks.push({
        segmentIndex: index,
        text: segment.text,
        score: segment.combinedScore,
        type
      })
    }
  })

  return peaks.sort((a, b) => b.score - a.score).slice(0, 5)
}

// ===========================================
// WORD CLOUD
// ===========================================

export interface WordCloudData {
  userId: string
  words: WordCloudWord[]
  totalWords: number
  uniqueWords: number
  vocabularyRichness: number
  topPhrases: string[]
  generatedAt: string
}

export interface WordCloudWord {
  text: string
  count: number
  weight: number // 1-10 for visualization
  category: 'common' | 'rhyme' | 'slang' | 'unique' | 'filler'
}

// Common filler words to exclude or de-emphasize
const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its',
  'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'im', 'ive', 'youre', 'dont', 'cant', 'wont', 'aint', 'gonna', 'gotta'
])

// Generate word cloud data
export async function generateWordCloud(
  userId: string,
  battleLimit: number = 50
): Promise<WordCloudData | null> {
  // Get user's recent transcripts
  const { data: rounds } = await supabase
    .from('battle_rounds')
    .select('transcript')
    .eq('player_id', userId)
    .not('transcript', 'is', null)
    .order('created_at', { ascending: false })
    .limit(battleLimit)

  if (!rounds || rounds.length === 0) return null

  // Combine all transcripts
  const allText = rounds.map(r => r.transcript).join(' ')
  const words = allText.toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1)

  // Count word frequencies
  const wordCounts: Record<string, number> = {}
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] || 0) + 1
  }

  // Calculate metrics
  const totalWords = words.length
  const uniqueWords = Object.keys(wordCounts).length
  const vocabularyRichness = uniqueWords / totalWords

  // Convert to word cloud format
  const maxCount = Math.max(...Object.values(wordCounts))
  const cloudWords: WordCloudWord[] = Object.entries(wordCounts)
    .map(([text, count]) => ({
      text,
      count,
      weight: Math.ceil((count / maxCount) * 10),
      category: categorizeWord(text, count, maxCount)
    }))
    .filter(w => !FILLER_WORDS.has(w.text) || w.count > maxCount * 0.3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 100)

  // Extract top phrases (bigrams)
  const topPhrases = extractTopPhrases(allText)

  return {
    userId,
    words: cloudWords,
    totalWords,
    uniqueWords,
    vocabularyRichness,
    topPhrases,
    generatedAt: new Date().toISOString()
  }
}

// Categorize word
function categorizeWord(word: string, count: number, maxCount: number): WordCloudWord['category'] {
  if (FILLER_WORDS.has(word)) return 'filler'

  // Slang detection (simplified)
  const slangWords = ['yo', 'dawg', 'fam', 'bruh', 'dope', 'fire', 'sick', 'lit', 'bars', 'flow', 'spit']
  if (slangWords.includes(word)) return 'slang'

  // If word appears only once or twice, it's unique
  if (count <= 2) return 'unique'

  // If word ends with common rhyme endings, mark as rhyme word
  const rhymeEndings = ['ing', 'tion', 'ay', 'ight', 'ow', 'ame']
  if (rhymeEndings.some(ending => word.endsWith(ending))) return 'rhyme'

  return 'common'
}

// Extract top phrases (bigrams)
function extractTopPhrases(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
  const phrases: Record<string, number> = {}

  for (let i = 0; i < words.length - 1; i++) {
    if (FILLER_WORDS.has(words[i]) || FILLER_WORDS.has(words[i + 1])) continue
    const phrase = `${words[i]} ${words[i + 1]}`
    phrases[phrase] = (phrases[phrase] || 0) + 1
  }

  return Object.entries(phrases)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase]) => phrase)
}

// ===========================================
// OPPONENT SCOUTING
// ===========================================

export interface OpponentScoutReport {
  opponentId: string
  opponent: Profile
  generatedAt: string

  // Overall stats
  overallStats: {
    totalBattles: number
    winRate: number
    averageScore: number
    currentStreak: number
    eloTrend: 'rising' | 'falling' | 'stable'
  }

  // Strengths and weaknesses
  strengths: string[]
  weaknesses: string[]

  // Scoring breakdown
  categoryAverages: {
    rhyme: number
    flow: number
    punchlines: number
    delivery: number
    creativity: number
    rebuttal: number
  }

  // Patterns
  patterns: {
    bestRound: number // Which round they perform best in
    startsStrong: boolean
    finishesStrong: boolean
    rebuttalSkill: 'weak' | 'average' | 'strong'
    styleType: string
  }

  // Head to head (if applicable)
  headToHead?: {
    totalMatches: number
    yourWins: number
    theirWins: number
    lastMatch?: Battle
  }

  // Recent form
  recentForm: Array<{
    battleId: string
    result: 'win' | 'loss'
    score: number
    opponentElo: number
  }>

  // Tendencies
  tendencies: string[]
}

// Generate scout report for opponent
export async function generateScoutReport(
  scouterId: string,
  opponentId: string
): Promise<OpponentScoutReport | null> {
  // Get opponent profile
  const { data: opponent } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', opponentId)
    .single()

  if (!opponent) return null

  // Get opponent's battles
  const { data: battles } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(id, username, elo_rating),
      player2:profiles!battles_player2_id_fkey(id, username, elo_rating)
    `)
    .or(`player1_id.eq.${opponentId},player2_id.eq.${opponentId}`)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(50)

  // Get opponent's rounds
  const { data: rounds } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('player_id', opponentId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Calculate stats
  const totalBattles = battles?.length || 0
  const wins = battles?.filter(b => b.winner_id === opponentId).length || 0
  const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0

  // Calculate category averages
  const categoryAverages = {
    rhyme: 0,
    flow: 0,
    punchlines: 0,
    delivery: 0,
    creativity: 0,
    rebuttal: 0
  }

  if (rounds && rounds.length > 0) {
    for (const round of rounds) {
      categoryAverages.rhyme += round.rhyme_score || 0
      categoryAverages.flow += round.flow_score || 0
      categoryAverages.punchlines += round.punchlines_score || 0
      categoryAverages.delivery += round.delivery_score || 0
      categoryAverages.creativity += round.creativity_score || 0
      categoryAverages.rebuttal += round.rebuttal_score || 0
    }

    const count = rounds.length
    Object.keys(categoryAverages).forEach(key => {
      categoryAverages[key as keyof typeof categoryAverages] /= count
    })
  }

  // Identify strengths and weaknesses
  const sortedCategories = Object.entries(categoryAverages)
    .sort((a, b) => b[1] - a[1])

  const strengths = sortedCategories.slice(0, 2).map(([cat, score]) =>
    `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${Math.round(score)}/100)`
  )

  const weaknesses = sortedCategories.slice(-2).map(([cat, score]) =>
    `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${Math.round(score)}/100)`
  )

  // Analyze patterns
  const roundScores: Record<number, number[]> = { 1: [], 2: [], 3: [] }
  rounds?.forEach(round => {
    if (roundScores[round.round_number]) {
      roundScores[round.round_number].push(round.total_score || 0)
    }
  })

  const avgByRound = Object.entries(roundScores).map(([round, scores]) => ({
    round: parseInt(round),
    avg: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  }))

  const bestRound = avgByRound.sort((a, b) => b.avg - a.avg)[0]?.round || 1
  const startsStrong = avgByRound.find(r => r.round === 1)?.avg || 0 >
                       avgByRound.find(r => r.round === 3)?.avg || 0
  const finishesStrong = !startsStrong

  // Head to head with scouter
  const h2hBattles = battles?.filter(b =>
    (b.player1_id === scouterId || b.player2_id === scouterId)
  ) || []

  const headToHead = h2hBattles.length > 0 ? {
    totalMatches: h2hBattles.length,
    yourWins: h2hBattles.filter(b => b.winner_id === scouterId).length,
    theirWins: h2hBattles.filter(b => b.winner_id === opponentId).length,
    lastMatch: h2hBattles[0]
  } : undefined

  // Recent form
  const recentForm = (battles || []).slice(0, 5).map(b => ({
    battleId: b.id,
    result: b.winner_id === opponentId ? 'win' as const : 'loss' as const,
    score: b.player1_id === opponentId ? b.player1_score : b.player2_score,
    opponentElo: b.player1_id === opponentId
      ? b.player2?.elo_rating || 1000
      : b.player1?.elo_rating || 1000
  }))

  // Calculate current streak
  let currentStreak = 0
  for (const battle of battles || []) {
    if (battle.winner_id === opponentId) {
      currentStreak++
    } else {
      break
    }
  }

  // Determine style type
  let styleType = 'Balanced'
  if (categoryAverages.punchlines > categoryAverages.flow + 10) {
    styleType = 'Punchline Heavy'
  } else if (categoryAverages.flow > categoryAverages.punchlines + 10) {
    styleType = 'Flow Focused'
  } else if (categoryAverages.creativity > 75) {
    styleType = 'Creative/Experimental'
  } else if (categoryAverages.rebuttal > 75) {
    styleType = 'Counter-Puncher'
  }

  // Generate tendencies
  const tendencies: string[] = []
  if (startsStrong) tendencies.push('Tends to start strong - be ready from round 1')
  if (finishesStrong) tendencies.push('Gets better as battle progresses - maintain pressure')
  if (categoryAverages.rebuttal > 70) tendencies.push('Strong rebuttals - be careful what you give them')
  if (categoryAverages.rebuttal < 50) tendencies.push('Weak at rebuttals - give them material to fumble')
  if (winRate > 60) tendencies.push('Experienced winner - expect quality')
  if (currentStreak >= 3) tendencies.push(`On a ${currentStreak} win streak - they\'re confident`)

  return {
    opponentId,
    opponent,
    generatedAt: new Date().toISOString(),
    overallStats: {
      totalBattles,
      winRate,
      averageScore: rounds && rounds.length > 0
        ? rounds.reduce((sum, r) => sum + (r.total_score || 0), 0) / rounds.length
        : 0,
      currentStreak,
      eloTrend: 'stable' // Would calculate from ELO history
    },
    strengths,
    weaknesses,
    categoryAverages,
    patterns: {
      bestRound,
      startsStrong,
      finishesStrong,
      rebuttalSkill: categoryAverages.rebuttal > 70 ? 'strong' :
                     categoryAverages.rebuttal > 50 ? 'average' : 'weak',
      styleType
    },
    headToHead,
    recentForm,
    tendencies
  }
}

// ===========================================
// PROGRESS REPORTS
// ===========================================

export interface ProgressReport {
  userId: string
  period: 'weekly' | 'monthly' | 'all_time'
  startDate: string
  endDate: string
  generatedAt: string

  // Summary
  summary: {
    battlesPlayed: number
    wins: number
    losses: number
    winRateChange: number // vs previous period
    eloChange: number
    coinsEarned: number
    xpEarned: number
  }

  // Category improvements
  categoryProgress: Array<{
    category: string
    currentAverage: number
    previousAverage: number
    change: number
    trend: 'improving' | 'declining' | 'stable'
  }>

  // Achievements
  achievementsUnlocked: string[]
  milestonesReached: string[]

  // Best performances
  bestBattle: {
    battleId: string
    score: number
    opponent: string
    date: string
  } | null

  bestRound: {
    battleId: string
    roundNumber: number
    score: number
    date: string
  } | null

  // Areas to focus
  areasToImprove: Array<{
    area: string
    currentLevel: number
    suggestion: string
  }>

  // Streaks and records
  records: {
    longestWinStreak: number
    highestScore: number
    mostBattlesInDay: number
  }

  // Comparison to peers
  peerComparison: {
    percentileOverall: number
    percentileInTier: number
    battlesVsAverage: number
    winRateVsAverage: number
  }
}

// Generate progress report
export async function generateProgressReport(
  userId: string,
  period: ProgressReport['period']
): Promise<ProgressReport | null> {
  const now = new Date()
  let startDate: Date
  let previousStartDate: Date

  switch (period) {
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'monthly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'all_time':
      startDate = new Date(0)
      previousStartDate = new Date(0)
      break
  }

  // Get current period battles
  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'complete')
    .gte('completed_at', startDate.toISOString())
    .order('completed_at', { ascending: false })

  // Get current period rounds
  const { data: rounds } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('player_id', userId)
    .gte('created_at', startDate.toISOString())

  // Get previous period for comparison
  const { data: prevBattles } = await supabase
    .from('battles')
    .select('*')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'complete')
    .gte('completed_at', previousStartDate.toISOString())
    .lt('completed_at', startDate.toISOString())

  const { data: prevRounds } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('player_id', userId)
    .gte('created_at', previousStartDate.toISOString())
    .lt('created_at', startDate.toISOString())

  // Calculate current stats
  const currentBattles = battles?.length || 0
  const currentWins = battles?.filter(b => b.winner_id === userId).length || 0
  const currentWinRate = currentBattles > 0 ? (currentWins / currentBattles) * 100 : 0

  // Calculate previous stats
  const prevBattleCount = prevBattles?.length || 0
  const prevWins = prevBattles?.filter(b => b.winner_id === userId).length || 0
  const prevWinRate = prevBattleCount > 0 ? (prevWins / prevBattleCount) * 100 : 0

  // Calculate category progress
  const categories = ['rhyme', 'flow', 'punchlines', 'delivery', 'creativity', 'rebuttal']
  const categoryProgress = categories.map(cat => {
    const currentAvg = rounds && rounds.length > 0
      ? rounds.reduce((sum, r) => sum + (r[`${cat}_score`] || 0), 0) / rounds.length
      : 0

    const prevAvg = prevRounds && prevRounds.length > 0
      ? prevRounds.reduce((sum, r) => sum + (r[`${cat}_score`] || 0), 0) / prevRounds.length
      : 0

    const change = currentAvg - prevAvg

    return {
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      currentAverage: Math.round(currentAvg),
      previousAverage: Math.round(prevAvg),
      change: Math.round(change),
      trend: change > 5 ? 'improving' as const : change < -5 ? 'declining' as const : 'stable' as const
    }
  })

  // Find best battle
  let bestBattle = null
  if (battles && battles.length > 0) {
    const sorted = [...battles].sort((a, b) => {
      const aScore = a.player1_id === userId ? a.player1_score : a.player2_score
      const bScore = b.player1_id === userId ? b.player1_score : b.player2_score
      return bScore - aScore
    })

    const best = sorted[0]
    bestBattle = {
      battleId: best.id,
      score: best.player1_id === userId ? best.player1_score : best.player2_score,
      opponent: 'Opponent', // Would join with profiles
      date: best.completed_at
    }
  }

  // Find best round
  let bestRound = null
  if (rounds && rounds.length > 0) {
    const sorted = [...rounds].sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
    const best = sorted[0]
    bestRound = {
      battleId: best.battle_id,
      roundNumber: best.round_number,
      score: best.total_score || 0,
      date: best.created_at
    }
  }

  // Identify areas to improve
  const areasToImprove = categoryProgress
    .filter(c => c.currentAverage < 70)
    .sort((a, b) => a.currentAverage - b.currentAverage)
    .slice(0, 3)
    .map(c => ({
      area: c.category,
      currentLevel: c.currentAverage,
      suggestion: getImprovementSuggestion(c.category.toLowerCase())
    }))

  return {
    userId,
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    generatedAt: now.toISOString(),
    summary: {
      battlesPlayed: currentBattles,
      wins: currentWins,
      losses: currentBattles - currentWins,
      winRateChange: currentWinRate - prevWinRate,
      eloChange: 0, // Would calculate from ELO history
      coinsEarned: 0, // Would calculate from transactions
      xpEarned: 0
    },
    categoryProgress,
    achievementsUnlocked: [],
    milestonesReached: [],
    bestBattle,
    bestRound,
    areasToImprove,
    records: {
      longestWinStreak: 0, // Would calculate
      highestScore: bestRound?.score || 0,
      mostBattlesInDay: 0
    },
    peerComparison: {
      percentileOverall: 50,
      percentileInTier: 50,
      battlesVsAverage: 0,
      winRateVsAverage: 0
    }
  }
}

// Get improvement suggestion for a category
function getImprovementSuggestion(category: string): string {
  const suggestions: Record<string, string> = {
    rhyme: 'Practice multisyllabic rhymes and internal rhyming patterns',
    flow: 'Work on staying on beat - try rapping over different BPM tracks',
    punchlines: 'Study setup/punch structure and work on your wordplay',
    delivery: 'Record yourself and focus on energy and confidence',
    creativity: 'Experiment with unique angles and extended metaphors',
    rebuttal: 'Practice active listening and quick flips during battles'
  }
  return suggestions[category] || 'Keep practicing consistently'
}

// ===========================================
// STATS COMPARISON
// ===========================================

export interface StatsComparison {
  user1: ComparisonProfile
  user2: ComparisonProfile
  headToHead: {
    totalBattles: number
    user1Wins: number
    user2Wins: number
    draws: number
    recentMatches: Array<{
      battleId: string
      winnerId: string | null
      date: string
    }>
  }
  categories: Array<{
    name: string
    user1Value: number
    user2Value: number
    difference: number
    winner: 'user1' | 'user2' | 'tie'
  }>
  overallAdvantage: 'user1' | 'user2' | 'even'
  advantageAreas: {
    user1: string[]
    user2: string[]
  }
}

export interface ComparisonProfile {
  id: string
  username: string
  avatarUrl: string | null
  elo: number
  tier: string
  totalBattles: number
  winRate: number
  averageScore: number
  wins: number
  losses: number
  currentStreak: number
}

// Compare two users' stats
export async function compareStats(
  user1Id: string,
  user2Id: string
): Promise<StatsComparison | null> {
  // Get both profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [user1Id, user2Id])

  if (!profiles || profiles.length !== 2) return null

  const profile1 = profiles.find(p => p.id === user1Id)!
  const profile2 = profiles.find(p => p.id === user2Id)!

  // Get battle stats for both users
  const [user1Stats, user2Stats] = await Promise.all([
    getUserBattleStats(user1Id),
    getUserBattleStats(user2Id)
  ])

  // Get head to head battles
  const { data: h2hBattles } = await supabase
    .from('battles')
    .select('*')
    .or(`and(player1_id.eq.${user1Id},player2_id.eq.${user2Id}),and(player1_id.eq.${user2Id},player2_id.eq.${user1Id})`)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })

  const user1Wins = h2hBattles?.filter(b => b.winner_id === user1Id).length || 0
  const user2Wins = h2hBattles?.filter(b => b.winner_id === user2Id).length || 0

  // Get category averages for both users
  const [user1Categories, user2Categories] = await Promise.all([
    getCategoryAverages(user1Id),
    getCategoryAverages(user2Id)
  ])

  // Build category comparison
  const categoryNames = ['Rhyme', 'Flow', 'Punchlines', 'Delivery', 'Creativity', 'Rebuttal']
  const categories = categoryNames.map((name, i) => {
    const key = name.toLowerCase() as keyof typeof user1Categories
    const val1 = user1Categories[key]
    const val2 = user2Categories[key]

    return {
      name,
      user1Value: Math.round(val1),
      user2Value: Math.round(val2),
      difference: Math.round(val1 - val2),
      winner: val1 > val2 + 5 ? 'user1' as const :
              val2 > val1 + 5 ? 'user2' as const : 'tie' as const
    }
  })

  // Determine advantage areas
  const user1Advantages = categories.filter(c => c.winner === 'user1').map(c => c.name)
  const user2Advantages = categories.filter(c => c.winner === 'user2').map(c => c.name)

  // Overall advantage
  const user1Score = user1Advantages.length + (user1Stats.winRate > user2Stats.winRate ? 1 : 0)
  const user2Score = user2Advantages.length + (user2Stats.winRate > user1Stats.winRate ? 1 : 0)
  const overallAdvantage = user1Score > user2Score ? 'user1' :
                           user2Score > user1Score ? 'user2' : 'even'

  return {
    user1: {
      id: profile1.id,
      username: profile1.username,
      avatarUrl: profile1.avatar_url,
      elo: profile1.elo_rating,
      tier: getTierFromElo(profile1.elo_rating),
      totalBattles: user1Stats.totalBattles,
      winRate: user1Stats.winRate,
      averageScore: user1Stats.averageScore,
      wins: user1Stats.wins,
      losses: user1Stats.losses,
      currentStreak: user1Stats.currentStreak
    },
    user2: {
      id: profile2.id,
      username: profile2.username,
      avatarUrl: profile2.avatar_url,
      elo: profile2.elo_rating,
      tier: getTierFromElo(profile2.elo_rating),
      totalBattles: user2Stats.totalBattles,
      winRate: user2Stats.winRate,
      averageScore: user2Stats.averageScore,
      wins: user2Stats.wins,
      losses: user2Stats.losses,
      currentStreak: user2Stats.currentStreak
    },
    headToHead: {
      totalBattles: h2hBattles?.length || 0,
      user1Wins,
      user2Wins,
      draws: (h2hBattles?.length || 0) - user1Wins - user2Wins,
      recentMatches: (h2hBattles || []).slice(0, 5).map(b => ({
        battleId: b.id,
        winnerId: b.winner_id,
        date: b.completed_at
      }))
    },
    categories,
    overallAdvantage,
    advantageAreas: {
      user1: user1Advantages,
      user2: user2Advantages
    }
  }
}

// Helper: Get user battle stats
async function getUserBattleStats(userId: string): Promise<{
  totalBattles: number
  wins: number
  losses: number
  winRate: number
  averageScore: number
  currentStreak: number
}> {
  const { data: battles } = await supabase
    .from('battles')
    .select('*')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })

  const totalBattles = battles?.length || 0
  const wins = battles?.filter(b => b.winner_id === userId).length || 0
  const losses = totalBattles - wins

  let currentStreak = 0
  for (const battle of battles || []) {
    if (battle.winner_id === userId) {
      currentStreak++
    } else {
      break
    }
  }

  // Calculate average score
  let totalScore = 0
  let scoreCount = 0
  for (const battle of battles || []) {
    const score = battle.player1_id === userId ? battle.player1_score : battle.player2_score
    if (score) {
      totalScore += score
      scoreCount++
    }
  }

  return {
    totalBattles,
    wins,
    losses,
    winRate: totalBattles > 0 ? (wins / totalBattles) * 100 : 0,
    averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
    currentStreak
  }
}

// Helper: Get category averages
async function getCategoryAverages(userId: string): Promise<{
  rhyme: number
  flow: number
  punchlines: number
  delivery: number
  creativity: number
  rebuttal: number
}> {
  const { data: rounds } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('player_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const defaults = { rhyme: 0, flow: 0, punchlines: 0, delivery: 0, creativity: 0, rebuttal: 0 }

  if (!rounds || rounds.length === 0) return defaults

  const totals = { ...defaults }
  for (const round of rounds) {
    totals.rhyme += round.rhyme_score || 0
    totals.flow += round.flow_score || 0
    totals.punchlines += round.punchlines_score || 0
    totals.delivery += round.delivery_score || 0
    totals.creativity += round.creativity_score || 0
    totals.rebuttal += round.rebuttal_score || 0
  }

  const count = rounds.length
  return {
    rhyme: totals.rhyme / count,
    flow: totals.flow / count,
    punchlines: totals.punchlines / count,
    delivery: totals.delivery / count,
    creativity: totals.creativity / count,
    rebuttal: totals.rebuttal / count
  }
}

// Helper: Get tier from ELO
function getTierFromElo(elo: number): string {
  if (elo >= 2300) return 'Legend'
  if (elo >= 2100) return 'Grandmaster'
  if (elo >= 1900) return 'Master'
  if (elo >= 1700) return 'Diamond'
  if (elo >= 1500) return 'Platinum'
  if (elo >= 1300) return 'Gold'
  if (elo >= 1100) return 'Silver'
  return 'Bronze'
}
