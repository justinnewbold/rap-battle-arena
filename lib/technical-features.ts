import { supabase, Profile } from './supabase'

// Internationalization (i18n) Support
export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'ko' | 'zh'

export interface LocaleConfig {
  code: SupportedLocale
  name: string
  nativeName: string
  direction: 'ltr' | 'rtl'
  dateFormat: string
  numberFormat: {
    decimal: string
    thousands: string
    currency: string
  }
}

export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleConfig> = {
  en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', dateFormat: 'MM/DD/YYYY', numberFormat: { decimal: '.', thousands: ',', currency: 'USD' } },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',', thousands: '.', currency: 'EUR' } },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',', thousands: ' ', currency: 'EUR' } },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', dateFormat: 'DD.MM.YYYY', numberFormat: { decimal: ',', thousands: '.', currency: 'EUR' } },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',', thousands: '.', currency: 'BRL' } },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', dateFormat: 'YYYY/MM/DD', numberFormat: { decimal: '.', thousands: ',', currency: 'JPY' } },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', dateFormat: 'YYYY.MM.DD', numberFormat: { decimal: '.', thousands: ',', currency: 'KRW' } },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', dateFormat: 'YYYY-MM-DD', numberFormat: { decimal: '.', thousands: ',', currency: 'CNY' } }
}

// Translation keys type
export interface TranslationKeys {
  // Common
  'common.loading': string
  'common.error': string
  'common.success': string
  'common.cancel': string
  'common.save': string
  'common.delete': string
  'common.edit': string
  'common.search': string
  'common.back': string
  'common.next': string
  'common.previous': string

  // Navigation
  'nav.home': string
  'nav.battles': string
  'nav.practice': string
  'nav.leaderboard': string
  'nav.profile': string
  'nav.settings': string
  'nav.crews': string
  'nav.tournaments': string

  // Battle
  'battle.waiting': string
  'battle.ready': string
  'battle.yourTurn': string
  'battle.opponentTurn': string
  'battle.recording': string
  'battle.judging': string
  'battle.results': string
  'battle.winner': string
  'battle.draw': string
  'battle.round': string
  'battle.score': string
  'battle.spectators': string

  // Profile
  'profile.wins': string
  'profile.losses': string
  'profile.rating': string
  'profile.battles': string
  'profile.achievements': string
  'profile.friends': string

  // Settings
  'settings.language': string
  'settings.audio': string
  'settings.privacy': string
  'settings.notifications': string
  'settings.theme': string
}

// Default English translations
export const EN_TRANSLATIONS: TranslationKeys = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.success': 'Success!',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.search': 'Search',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.previous': 'Previous',

  // Navigation
  'nav.home': 'Home',
  'nav.battles': 'Battles',
  'nav.practice': 'Practice',
  'nav.leaderboard': 'Leaderboard',
  'nav.profile': 'Profile',
  'nav.settings': 'Settings',
  'nav.crews': 'Crews',
  'nav.tournaments': 'Tournaments',

  // Battle
  'battle.waiting': 'Waiting for opponent...',
  'battle.ready': 'Battle is ready!',
  'battle.yourTurn': 'Your turn!',
  'battle.opponentTurn': "Opponent's turn",
  'battle.recording': 'Recording...',
  'battle.judging': 'AI is judging...',
  'battle.results': 'Results',
  'battle.winner': 'Winner',
  'battle.draw': 'Draw',
  'battle.round': 'Round',
  'battle.score': 'Score',
  'battle.spectators': 'Spectators',

  // Profile
  'profile.wins': 'Wins',
  'profile.losses': 'Losses',
  'profile.rating': 'Rating',
  'profile.battles': 'Total Battles',
  'profile.achievements': 'Achievements',
  'profile.friends': 'Friends',

  // Settings
  'settings.language': 'Language',
  'settings.audio': 'Audio',
  'settings.privacy': 'Privacy',
  'settings.notifications': 'Notifications',
  'settings.theme': 'Theme'
}

// Translation function type
export type TranslationFunction = (key: keyof TranslationKeys, params?: Record<string, string>) => string

// Create translation function
export function createTranslator(translations: TranslationKeys): TranslationFunction {
  return (key: keyof TranslationKeys, params?: Record<string, string>) => {
    let text = translations[key] || key

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{{${paramKey}}}`, value)
      })
    }

    return text
  }
}

// Get user's preferred locale
export async function getUserLocale(userId: string): Promise<SupportedLocale> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('locale')
    .eq('user_id', userId)
    .single()

  if (error || !data?.locale) {
    return 'en'
  }
  return data.locale as SupportedLocale
}

// Set user's preferred locale
export async function setUserLocale(userId: string, locale: SupportedLocale): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .update({ locale })
    .eq('user_id', userId)

  if (error) {
    console.error('Error setting locale:', error)
    return false
  }
  return true
}

// Battle Analytics Dashboard Types
export interface BattleAnalytics {
  // Overview
  totalBattles: number
  totalWins: number
  totalLosses: number
  winRate: number
  averageScore: number

  // Performance over time
  scoreHistory: Array<{ date: string; averageScore: number; battlesCount: number }>
  eloHistory: Array<{ date: string; elo: number }>

  // Category breakdown
  categoryScores: {
    rhyme: { average: number; trend: 'up' | 'down' | 'stable' }
    flow: { average: number; trend: 'up' | 'down' | 'stable' }
    punchlines: { average: number; trend: 'up' | 'down' | 'stable' }
    delivery: { average: number; trend: 'up' | 'down' | 'stable' }
    creativity: { average: number; trend: 'up' | 'down' | 'stable' }
    rebuttal: { average: number; trend: 'up' | 'down' | 'stable' }
  }

  // Opponents
  mostFacedOpponents: Array<{ opponent: Profile; battles: number; wins: number }>
  nemesis: Profile | null // Most losses against
  favorite: Profile | null // Most wins against

  // Time patterns
  bestTimeOfDay: string
  mostActiveDays: string[]
  averageBattleDuration: number

  // Achievements
  achievementsUnlocked: number
  totalAchievements: number
  recentAchievements: Array<{ name: string; date: string }>

  // Rankings
  globalRank: number
  percentile: number
  tierDistribution: Record<string, number>
}

// Generate analytics for a user
export async function generateBattleAnalytics(userId: string): Promise<BattleAnalytics | null> {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) return null

  // Get battle history
  const { data: battles } = await supabase
    .from('battles')
    .select(`
      *,
      player1:profiles!battles_player1_id_fkey(id, username, avatar_url),
      player2:profiles!battles_player2_id_fkey(id, username, avatar_url)
    `)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(200)

  // Get battle rounds
  const { data: rounds } = await supabase
    .from('battle_rounds')
    .select('*')
    .eq('player_id', userId)
    .order('created_at', { ascending: false })
    .limit(500)

  // Get achievements
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)

  // Calculate metrics
  const totalBattles = battles?.length || 0
  const wins = battles?.filter(b =>
    b.winner_id === userId
  ).length || 0
  const losses = totalBattles - wins
  const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0

  // Calculate average scores
  const avgScores = {
    rhyme: 0,
    flow: 0,
    punchlines: 0,
    delivery: 0,
    creativity: 0,
    rebuttal: 0,
    total: 0
  }

  if (rounds && rounds.length > 0) {
    rounds.forEach(round => {
      avgScores.rhyme += round.rhyme_score || 0
      avgScores.flow += round.flow_score || 0
      avgScores.punchlines += round.punchlines_score || 0
      avgScores.delivery += round.delivery_score || 0
      avgScores.creativity += round.creativity_score || 0
      avgScores.rebuttal += round.rebuttal_score || 0
      avgScores.total += round.total_score || 0
    })

    const count = rounds.length
    Object.keys(avgScores).forEach(key => {
      avgScores[key as keyof typeof avgScores] /= count
    })
  }

  // Calculate trends (compare recent 20 vs previous 20)
  const calculateTrend = (scores: number[]): 'up' | 'down' | 'stable' => {
    if (scores.length < 20) return 'stable'
    const recent = scores.slice(0, 10).reduce((a, b) => a + b, 0) / 10
    const previous = scores.slice(10, 20).reduce((a, b) => a + b, 0) / 10
    if (recent > previous * 1.05) return 'up'
    if (recent < previous * 0.95) return 'down'
    return 'stable'
  }

  // Get global rank
  const { count: betterPlayers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gt('elo_rating', profile.elo_rating)

  const { count: totalPlayers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const globalRank = (betterPlayers || 0) + 1
  const percentile = totalPlayers ? ((totalPlayers - globalRank) / totalPlayers) * 100 : 0

  return {
    totalBattles,
    totalWins: wins,
    totalLosses: losses,
    winRate,
    averageScore: avgScores.total,

    scoreHistory: [], // Would generate from rounds with date grouping
    eloHistory: [], // Would track ELO changes over time

    categoryScores: {
      rhyme: { average: avgScores.rhyme, trend: 'stable' },
      flow: { average: avgScores.flow, trend: 'stable' },
      punchlines: { average: avgScores.punchlines, trend: 'stable' },
      delivery: { average: avgScores.delivery, trend: 'stable' },
      creativity: { average: avgScores.creativity, trend: 'stable' },
      rebuttal: { average: avgScores.rebuttal, trend: 'stable' }
    },

    mostFacedOpponents: [], // Would calculate from battles
    nemesis: null,
    favorite: null,

    bestTimeOfDay: '20:00', // Would calculate from battle times
    mostActiveDays: ['Saturday', 'Friday'],
    averageBattleDuration: 300, // 5 minutes

    achievementsUnlocked: achievements?.length || 0,
    totalAchievements: 30, // Total possible
    recentAchievements: (achievements || []).slice(0, 3).map(a => ({
      name: a.achievement_type,
      date: a.unlocked_at
    })),

    globalRank,
    percentile,
    tierDistribution: {
      'Bronze': 40,
      'Silver': 30,
      'Gold': 20,
      'Diamond': 8,
      'Master': 2
    }
  }
}

// Custom Room Themes
export interface RoomTheme {
  id: string
  name: string
  description: string
  preview_url: string
  background_url: string
  background_color: string
  accent_color: string
  text_color: string
  animation_style: 'none' | 'subtle' | 'dynamic'
  particle_effect: string | null
  sound_pack_id: string | null
  is_premium: boolean
  price_coins: number
  created_at: string
}

export interface UserTheme {
  id: string
  user_id: string
  theme_id: string
  is_active: boolean
  acquired_at: string
  // Joined
  theme?: RoomTheme
}

// Default themes
export const DEFAULT_THEMES: Omit<RoomTheme, 'id' | 'created_at'>[] = [
  {
    name: 'Classic Arena',
    description: 'The original battle arena experience',
    preview_url: '/themes/classic/preview.png',
    background_url: '/themes/classic/bg.jpg',
    background_color: '#1a1a2e',
    accent_color: '#e94560',
    text_color: '#ffffff',
    animation_style: 'subtle',
    particle_effect: null,
    sound_pack_id: null,
    is_premium: false,
    price_coins: 0
  },
  {
    name: 'Neon Underground',
    description: 'Cyberpunk vibes with neon lights',
    preview_url: '/themes/neon/preview.png',
    background_url: '/themes/neon/bg.jpg',
    background_color: '#0f0f23',
    accent_color: '#00ff88',
    text_color: '#ffffff',
    animation_style: 'dynamic',
    particle_effect: 'neon_rain',
    sound_pack_id: null,
    is_premium: true,
    price_coins: 200
  },
  {
    name: 'Street Corner',
    description: 'Authentic street battle atmosphere',
    preview_url: '/themes/street/preview.png',
    background_url: '/themes/street/bg.jpg',
    background_color: '#2d2d2d',
    accent_color: '#ffd700',
    text_color: '#ffffff',
    animation_style: 'subtle',
    particle_effect: 'smoke',
    sound_pack_id: null,
    is_premium: true,
    price_coins: 150
  },
  {
    name: 'Royal Stage',
    description: 'Battle like royalty on a grand stage',
    preview_url: '/themes/royal/preview.png',
    background_url: '/themes/royal/bg.jpg',
    background_color: '#1a1a40',
    accent_color: '#c9a227',
    text_color: '#ffffff',
    animation_style: 'dynamic',
    particle_effect: 'sparkles',
    sound_pack_id: null,
    is_premium: true,
    price_coins: 300
  },
  {
    name: 'Fire Pit',
    description: 'Turn up the heat in this intense arena',
    preview_url: '/themes/fire/preview.png',
    background_url: '/themes/fire/bg.jpg',
    background_color: '#1a0a00',
    accent_color: '#ff4500',
    text_color: '#ffffff',
    animation_style: 'dynamic',
    particle_effect: 'fire',
    sound_pack_id: null,
    is_premium: true,
    price_coins: 250
  }
]

// Get available themes
export async function getAvailableThemes(): Promise<RoomTheme[]> {
  const { data, error } = await supabase
    .from('room_themes')
    .select('*')
    .order('price_coins', { ascending: true })

  if (error) {
    console.error('Error fetching themes:', error)
    return []
  }
  return data || []
}

// Get user's owned themes
export async function getUserThemes(userId: string): Promise<UserTheme[]> {
  const { data, error } = await supabase
    .from('user_themes')
    .select('*, theme:room_themes(*)')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user themes:', error)
    return []
  }
  return data || []
}

// Get user's active theme
export async function getUserActiveTheme(userId: string): Promise<RoomTheme | null> {
  const { data, error } = await supabase
    .from('user_themes')
    .select('theme:room_themes(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data?.theme) {
    return null
  }
  return data.theme as unknown as RoomTheme
}

// Purchase and set theme
export async function purchaseTheme(userId: string, themeId: string): Promise<boolean> {
  // Check if already owned
  const { count } = await supabase
    .from('user_themes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('theme_id', themeId)

  if (count && count > 0) return false

  // Add to user's themes
  const { error } = await supabase
    .from('user_themes')
    .insert({
      user_id: userId,
      theme_id: themeId,
      is_active: false
    })

  if (error) {
    console.error('Error purchasing theme:', error)
    return false
  }
  return true
}

// Set active theme
export async function setActiveTheme(userId: string, themeId: string): Promise<boolean> {
  // Deactivate all themes
  await supabase
    .from('user_themes')
    .update({ is_active: false })
    .eq('user_id', userId)

  // Activate selected theme
  const { error } = await supabase
    .from('user_themes')
    .update({ is_active: true })
    .eq('user_id', userId)
    .eq('theme_id', themeId)

  if (error) {
    console.error('Error setting active theme:', error)
    return false
  }
  return true
}

// Real-time Audio Effects
export interface AudioEffect {
  id: string
  name: string
  description: string
  type: 'reverb' | 'delay' | 'pitch' | 'chorus' | 'distortion' | 'compressor' | 'eq'
  parameters: Record<string, number>
  preset_values: Record<string, number>
  is_premium: boolean
  price_coins: number
}

export interface AudioPreset {
  id: string
  name: string
  description: string
  effects: Array<{ effect_id: string; parameters: Record<string, number> }>
  is_premium: boolean
  price_coins: number
  created_by: string | null
  is_official: boolean
}

// Default audio effects
export const AUDIO_EFFECTS: Omit<AudioEffect, 'id'>[] = [
  {
    name: 'Studio Reverb',
    description: 'Professional studio reverb',
    type: 'reverb',
    parameters: { roomSize: 0.5, damping: 0.5, wetDry: 0.3 },
    preset_values: { roomSize: 0.7, damping: 0.3, wetDry: 0.4 },
    is_premium: false,
    price_coins: 0
  },
  {
    name: 'Hall Reverb',
    description: 'Concert hall ambience',
    type: 'reverb',
    parameters: { roomSize: 0.9, damping: 0.2, wetDry: 0.5 },
    preset_values: { roomSize: 0.9, damping: 0.2, wetDry: 0.5 },
    is_premium: true,
    price_coins: 100
  },
  {
    name: 'Slapback Delay',
    description: 'Quick echo effect',
    type: 'delay',
    parameters: { time: 0.1, feedback: 0.2, wetDry: 0.3 },
    preset_values: { time: 0.1, feedback: 0.2, wetDry: 0.3 },
    is_premium: false,
    price_coins: 0
  },
  {
    name: 'Pitch Shift Up',
    description: 'Raise pitch slightly',
    type: 'pitch',
    parameters: { semitones: 2, cents: 0 },
    preset_values: { semitones: 2, cents: 0 },
    is_premium: true,
    price_coins: 150
  },
  {
    name: 'Pitch Shift Down',
    description: 'Lower pitch for depth',
    type: 'pitch',
    parameters: { semitones: -2, cents: 0 },
    preset_values: { semitones: -2, cents: 0 },
    is_premium: true,
    price_coins: 150
  },
  {
    name: 'Auto-Tune Light',
    description: 'Subtle pitch correction',
    type: 'pitch',
    parameters: { correction: 0.3, key: 0, scale: 0 },
    preset_values: { correction: 0.3, key: 0, scale: 0 },
    is_premium: true,
    price_coins: 200
  },
  {
    name: 'Vocal Compressor',
    description: 'Even out vocal dynamics',
    type: 'compressor',
    parameters: { threshold: -20, ratio: 4, attack: 0.01, release: 0.1 },
    preset_values: { threshold: -20, ratio: 4, attack: 0.01, release: 0.1 },
    is_premium: false,
    price_coins: 0
  },
  {
    name: 'Bass Boost',
    description: 'Add low-end punch',
    type: 'eq',
    parameters: { low: 6, mid: 0, high: 0 },
    preset_values: { low: 6, mid: 0, high: 0 },
    is_premium: true,
    price_coins: 75
  },
  {
    name: 'Presence Boost',
    description: 'Cut through the mix',
    type: 'eq',
    parameters: { low: 0, mid: 3, high: 4 },
    preset_values: { low: 0, mid: 3, high: 4 },
    is_premium: true,
    price_coins: 75
  }
]

// Audio presets
export const AUDIO_PRESETS: Omit<AudioPreset, 'id'>[] = [
  {
    name: 'Clean Vocals',
    description: 'Natural sound with light compression',
    effects: [],
    is_premium: false,
    price_coins: 0,
    created_by: null,
    is_official: true
  },
  {
    name: 'Battle Ready',
    description: 'Punchy vocals that cut through',
    effects: [],
    is_premium: false,
    price_coins: 0,
    created_by: null,
    is_official: true
  },
  {
    name: 'Studio Pro',
    description: 'Professional studio sound',
    effects: [],
    is_premium: true,
    price_coins: 200,
    created_by: null,
    is_official: true
  },
  {
    name: 'Underground Raw',
    description: 'Gritty underground aesthetic',
    effects: [],
    is_premium: true,
    price_coins: 150,
    created_by: null,
    is_official: true
  }
]

// Get available effects
export async function getAudioEffects(): Promise<AudioEffect[]> {
  const { data, error } = await supabase
    .from('audio_effects')
    .select('*')
    .order('type')
    .order('name')

  if (error) {
    console.error('Error fetching audio effects:', error)
    return []
  }
  return data || []
}

// Get audio presets
export async function getAudioPresets(): Promise<AudioPreset[]> {
  const { data, error } = await supabase
    .from('audio_presets')
    .select('*')
    .order('is_official', { ascending: false })
    .order('name')

  if (error) {
    console.error('Error fetching audio presets:', error)
    return []
  }
  return data || []
}

// Get user's unlocked effects
export async function getUserUnlockedEffects(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_audio_effects')
    .select('effect_id')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user effects:', error)
    return []
  }
  return data?.map(d => d.effect_id) || []
}

// Purchase audio effect
export async function purchaseAudioEffect(userId: string, effectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_audio_effects')
    .insert({
      user_id: userId,
      effect_id: effectId
    })

  if (error) {
    console.error('Error purchasing effect:', error)
    return false
  }
  return true
}

// Save custom preset
export async function saveCustomPreset(
  userId: string,
  name: string,
  description: string,
  effects: AudioPreset['effects']
): Promise<AudioPreset | null> {
  const { data, error } = await supabase
    .from('audio_presets')
    .insert({
      name,
      description,
      effects,
      created_by: userId,
      is_official: false,
      is_premium: false,
      price_coins: 0
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving preset:', error)
    return null
  }
  return data
}

// Get user's custom presets
export async function getUserCustomPresets(userId: string): Promise<AudioPreset[]> {
  const { data, error } = await supabase
    .from('audio_presets')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user presets:', error)
    return []
  }
  return data || []
}

// Web Audio API effect chain builder
export function buildEffectChain(
  audioContext: AudioContext,
  effects: Array<{ type: AudioEffect['type']; parameters: Record<string, number> }>
): AudioNode[] {
  const nodes: AudioNode[] = []

  for (const effect of effects) {
    switch (effect.type) {
      case 'compressor': {
        const compressor = audioContext.createDynamicsCompressor()
        compressor.threshold.value = effect.parameters.threshold || -24
        compressor.ratio.value = effect.parameters.ratio || 4
        compressor.attack.value = effect.parameters.attack || 0.003
        compressor.release.value = effect.parameters.release || 0.25
        nodes.push(compressor)
        break
      }
      case 'eq': {
        // Low shelf
        const lowShelf = audioContext.createBiquadFilter()
        lowShelf.type = 'lowshelf'
        lowShelf.frequency.value = 200
        lowShelf.gain.value = effect.parameters.low || 0
        nodes.push(lowShelf)

        // Mid peaking
        const midPeak = audioContext.createBiquadFilter()
        midPeak.type = 'peaking'
        midPeak.frequency.value = 1000
        midPeak.Q.value = 1
        midPeak.gain.value = effect.parameters.mid || 0
        nodes.push(midPeak)

        // High shelf
        const highShelf = audioContext.createBiquadFilter()
        highShelf.type = 'highshelf'
        highShelf.frequency.value = 4000
        highShelf.gain.value = effect.parameters.high || 0
        nodes.push(highShelf)
        break
      }
      case 'delay': {
        const delay = audioContext.createDelay()
        delay.delayTime.value = effect.parameters.time || 0.1
        nodes.push(delay)
        break
      }
      // Reverb, pitch shift, etc. would need more complex implementations
      // or use external libraries like Tone.js
    }
  }

  return nodes
}

// Connect effect chain
export function connectEffectChain(
  source: AudioNode,
  destination: AudioNode,
  effectNodes: AudioNode[]
): void {
  if (effectNodes.length === 0) {
    source.connect(destination)
    return
  }

  source.connect(effectNodes[0])

  for (let i = 0; i < effectNodes.length - 1; i++) {
    effectNodes[i].connect(effectNodes[i + 1])
  }

  effectNodes[effectNodes.length - 1].connect(destination)
}
