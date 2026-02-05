// Community & Safety Features
// Content Filters, Age Verification, Mentorship Program, Community Guidelines, Appeal System

import { supabase, Profile } from './supabase'

// ===========================================
// CONTENT FILTERS
// ===========================================

export type ContentViolationType =
  | 'hate_speech'
  | 'harassment'
  | 'threats'
  | 'explicit_content'
  | 'spam'
  | 'doxxing'
  | 'discrimination'
  | 'other'

export interface ContentFilter {
  id: string
  name: string
  pattern: string // Regex pattern
  violation_type: ContentViolationType
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: 'warn' | 'mute' | 'flag' | 'block'
  is_active: boolean
  created_at: string
}

export interface ContentViolation {
  id: string
  user_id: string
  content_type: 'message' | 'verse' | 'username' | 'bio' | 'comment'
  content: string
  violation_type: ContentViolationType
  severity: ContentFilter['severity']
  action_taken: ContentFilter['action']
  filter_id: string | null
  reviewed: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  appealed: boolean
  created_at: string
}

// Profanity and hate speech patterns (simplified - would be much more comprehensive)
const CONTENT_PATTERNS: Array<{ pattern: RegExp; type: ContentViolationType; severity: ContentFilter['severity'] }> = [
  // Hate speech patterns
  { pattern: /\b(n[i1]gg[ae]r?s?|f[a@]gg?[o0]ts?)\b/gi, type: 'hate_speech', severity: 'critical' },
  { pattern: /\b(k[i1]ke|sp[i1]c|ch[i1]nk|g[o0]{2}k)\b/gi, type: 'discrimination', severity: 'high' },

  // Threat patterns
  { pattern: /\b(i('ll| will)?\s*(kill|murder|shoot|stab)\s*(you|u|ur))\b/gi, type: 'threats', severity: 'critical' },
  { pattern: /\b(you('re| are)?\s*dead|gonna\s*die)\b/gi, type: 'threats', severity: 'high' },

  // Doxxing patterns
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, type: 'doxxing', severity: 'high' }, // Phone numbers
  { pattern: /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)\b/gi, type: 'doxxing', severity: 'high' }, // Addresses

  // Spam patterns
  { pattern: /(https?:\/\/[^\s]+){3,}/gi, type: 'spam', severity: 'medium' }, // Multiple links
  { pattern: /(.)\1{10,}/g, type: 'spam', severity: 'low' } // Repeated characters
]

// Check content for violations
export function checkContentViolations(content: string): Array<{
  type: ContentViolationType
  severity: ContentFilter['severity']
  match: string
}> {
  const violations: Array<{ type: ContentViolationType; severity: ContentFilter['severity']; match: string }> = []

  for (const pattern of CONTENT_PATTERNS) {
    const matches = content.match(pattern.pattern)
    if (matches) {
      for (const match of matches) {
        violations.push({
          type: pattern.type,
          severity: pattern.severity,
          match
        })
      }
    }
  }

  return violations
}

// Real-time content filter (for live battles)
export async function filterLiveContent(
  userId: string,
  content: string,
  contentType: ContentViolation['content_type']
): Promise<{ allowed: boolean; filtered: string; violations: ContentViolation[] }> {
  const violations = checkContentViolations(content)

  if (violations.length === 0) {
    return { allowed: true, filtered: content, violations: [] }
  }

  // Record violations
  const recordedViolations: ContentViolation[] = []

  for (const violation of violations) {
    const { data } = await supabase
      .from('content_violations')
      .insert({
        user_id: userId,
        content_type: contentType,
        content: content.substring(0, 500),
        violation_type: violation.type,
        severity: violation.severity,
        action_taken: getActionForSeverity(violation.severity)
      })
      .select()
      .single()

    if (data) {
      recordedViolations.push(data)
    }
  }

  // Check if any critical violations
  const hasCritical = violations.some(v => v.severity === 'critical')
  const hasHigh = violations.some(v => v.severity === 'high')

  // Filter content by replacing violations
  let filtered = content
  for (const violation of violations) {
    filtered = filtered.replace(new RegExp(escapeRegex(violation.match), 'gi'), '[filtered]')
  }

  return {
    allowed: !hasCritical && !hasHigh,
    filtered,
    violations: recordedViolations
  }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getActionForSeverity(severity: ContentFilter['severity']): ContentFilter['action'] {
  switch (severity) {
    case 'critical': return 'block'
    case 'high': return 'flag'
    case 'medium': return 'mute'
    case 'low': return 'warn'
  }
}

// Get user's violation history
export async function getUserViolations(userId: string): Promise<ContentViolation[]> {
  const { data, error } = await supabase
    .from('content_violations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching violations:', error)
    return []
  }
  return data || []
}

// Get violation count for strike system
export async function getViolationCount(userId: string, days: number = 30): Promise<Record<ContentFilter['severity'], number>> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('content_violations')
    .select('severity')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())

  if (error) {
    return { low: 0, medium: 0, high: 0, critical: 0 }
  }

  const counts = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const violation of data || []) {
    counts[violation.severity as ContentFilter['severity']]++
  }

  return counts
}

// ===========================================
// AGE VERIFICATION
// ===========================================

export type AgeVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface AgeVerification {
  id: string
  user_id: string
  date_of_birth: string
  status: AgeVerificationStatus
  verification_method: 'self_declare' | 'id_upload' | 'third_party'
  is_adult: boolean // 18+
  document_url: string | null
  rejection_reason: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface AgeRestrictedContent {
  type: 'explicit_battles' | 'adult_leagues' | 'mature_beats'
  minAge: number
  description: string
}

export const AGE_RESTRICTED_CONTENT: AgeRestrictedContent[] = [
  { type: 'explicit_battles', minAge: 18, description: 'Battles with explicit content allowed' },
  { type: 'adult_leagues', minAge: 18, description: 'Competitive leagues for adults only' },
  { type: 'mature_beats', minAge: 18, description: 'Beats with mature themes' }
]

// Submit age verification
export async function submitAgeVerification(
  userId: string,
  dateOfBirth: string,
  method: AgeVerification['verification_method'],
  documentUrl?: string
): Promise<AgeVerification | null> {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear()
  const isAdult = age >= 18 || (age === 17 && today.getMonth() > dob.getMonth())

  const { data, error } = await supabase
    .from('age_verifications')
    .upsert({
      user_id: userId,
      date_of_birth: dateOfBirth,
      verification_method: method,
      is_adult: isAdult,
      document_url: documentUrl || null,
      status: method === 'self_declare' ? 'verified' : 'pending',
      verified_at: method === 'self_declare' ? new Date().toISOString() : null
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting age verification:', error)
    return null
  }
  return data
}

// Get user's age verification
export async function getAgeVerification(userId: string): Promise<AgeVerification | null> {
  const { data, error } = await supabase
    .from('age_verifications')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

// Check if user can access age-restricted content
export async function canAccessAgeRestrictedContent(
  userId: string,
  contentType: AgeRestrictedContent['type']
): Promise<boolean> {
  const verification = await getAgeVerification(userId)
  if (!verification || verification.status !== 'verified') return false

  const content = AGE_RESTRICTED_CONTENT.find(c => c.type === contentType)
  if (!content) return false

  return verification.is_adult
}

// ===========================================
// MENTORSHIP PROGRAM
// ===========================================

export type MentorshipStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export interface Mentor {
  id: string
  user_id: string
  is_active: boolean
  specialties: string[]
  max_mentees: number
  current_mentees: number
  total_mentored: number
  rating: number
  bio: string | null
  availability: string // JSON schedule
  requirements: {
    minElo?: number
    minBattles?: number
  }
  created_at: string
  // Joined
  user?: Profile
}

export interface MentorshipRequest {
  id: string
  mentee_id: string
  mentor_id: string
  status: MentorshipStatus
  message: string | null
  goals: string[]
  started_at: string | null
  ended_at: string | null
  created_at: string
  // Joined
  mentee?: Profile
  mentor?: Mentor
}

export interface MentorSession {
  id: string
  mentorship_id: string
  scheduled_for: string
  duration_minutes: number
  topic: string
  notes: string | null
  recording_url: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  mentee_rating: number | null
  created_at: string
}

// Apply to become a mentor
export async function applyAsMentor(
  userId: string,
  data: {
    specialties: string[]
    maxMentees: number
    bio?: string
    availability: Record<string, string[]>
  }
): Promise<Mentor | null> {
  // Check eligibility (example: 1500+ ELO, 100+ battles)
  const { data: profile } = await supabase
    .from('profiles')
    .select('elo_rating, total_battles')
    .eq('id', userId)
    .single()

  if (!profile || profile.elo_rating < 1500 || profile.total_battles < 100) {
    console.error('User does not meet mentor requirements')
    return null
  }

  const { data: mentor, error } = await supabase
    .from('mentors')
    .insert({
      user_id: userId,
      specialties: data.specialties,
      max_mentees: data.maxMentees,
      bio: data.bio || null,
      availability: JSON.stringify(data.availability),
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating mentor:', error)
    return null
  }
  return mentor
}

// Get available mentors
export async function getAvailableMentors(
  options: { specialty?: string; limit?: number } = {}
): Promise<Mentor[]> {
  let query = supabase
    .from('mentors')
    .select(`
      *,
      user:profiles(id, username, avatar_url, elo_rating, wins, losses)
    `)
    .eq('is_active', true)
    .lt('current_mentees', supabase.rpc('get_max_mentees')) // Has capacity

  if (options.specialty) {
    query = query.contains('specialties', [options.specialty])
  }

  const { data, error } = await query
    .order('rating', { ascending: false })
    .limit(options.limit || 20)

  if (error) {
    console.error('Error fetching mentors:', error)
    return []
  }
  return data || []
}

// Request mentorship
export async function requestMentorship(
  menteeId: string,
  mentorId: string,
  message: string,
  goals: string[]
): Promise<MentorshipRequest | null> {
  const { data, error } = await supabase
    .from('mentorship_requests')
    .insert({
      mentee_id: menteeId,
      mentor_id: mentorId,
      message,
      goals,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error requesting mentorship:', error)
    return null
  }

  // Notify mentor
  const { data: mentor } = await supabase
    .from('mentors')
    .select('user_id')
    .eq('id', mentorId)
    .single()

  if (mentor) {
    await supabase.from('notifications').insert({
      user_id: mentor.user_id,
      type: 'mentorship_request',
      title: 'New Mentorship Request',
      message: 'Someone wants you to be their mentor!',
      data: { request_id: data.id }
    })
  }

  return data
}

// Accept mentorship request
export async function acceptMentorship(requestId: string, mentorUserId: string): Promise<boolean> {
  const { data: request } = await supabase
    .from('mentorship_requests')
    .select('*, mentor:mentors(*)')
    .eq('id', requestId)
    .single()

  if (!request || request.mentor?.user_id !== mentorUserId) {
    return false
  }

  // Update request
  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      status: 'active',
      started_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) return false

  // Update mentor's mentee count
  await supabase
    .from('mentors')
    .update({
      current_mentees: request.mentor.current_mentees + 1
    })
    .eq('id', request.mentor.id)

  return true
}

// Schedule mentor session
export async function scheduleMentorSession(
  mentorshipId: string,
  scheduledFor: string,
  durationMinutes: number,
  topic: string
): Promise<MentorSession | null> {
  const { data, error } = await supabase
    .from('mentor_sessions')
    .insert({
      mentorship_id: mentorshipId,
      scheduled_for: scheduledFor,
      duration_minutes: durationMinutes,
      topic,
      status: 'scheduled'
    })
    .select()
    .single()

  if (error) {
    console.error('Error scheduling session:', error)
    return null
  }
  return data
}

// ===========================================
// COMMUNITY GUIDELINES
// ===========================================

export interface CommunityGuideline {
  id: string
  title: string
  description: string
  category: 'conduct' | 'content' | 'fair_play' | 'privacy' | 'other'
  severity_if_violated: ContentFilter['severity']
  examples: string[]
  order: number
  is_active: boolean
}

export interface GuidelineAcceptance {
  id: string
  user_id: string
  guideline_version: string
  accepted_at: string
  ip_address: string | null
}

// Current guideline version
export const CURRENT_GUIDELINE_VERSION = '2.0.0'

// Community guidelines
export const COMMUNITY_GUIDELINES: Omit<CommunityGuideline, 'id'>[] = [
  {
    title: 'Respect All Participants',
    description: 'Treat everyone with respect. Battle bars should be clever, not cruel.',
    category: 'conduct',
    severity_if_violated: 'high',
    examples: [
      'Personal attacks outside of battle context are not allowed',
      'Discriminatory language is strictly prohibited',
      'Targeting someone\'s real-life circumstances crosses the line'
    ],
    order: 1,
    is_active: true
  },
  {
    title: 'Keep It Fair',
    description: 'No cheating, exploiting, or unsportsmanlike behavior.',
    category: 'fair_play',
    severity_if_violated: 'high',
    examples: [
      'Using pre-written verses in freestyle battles',
      'Exploiting technical glitches for advantage',
      'Coordinating with opponents to manipulate rankings'
    ],
    order: 2,
    is_active: true
  },
  {
    title: 'Appropriate Content',
    description: 'Age-appropriate content in public spaces.',
    category: 'content',
    severity_if_violated: 'medium',
    examples: [
      'Explicit content only in age-verified areas',
      'No graphic violence descriptions',
      'Keep profile content appropriate'
    ],
    order: 3,
    is_active: true
  },
  {
    title: 'Protect Privacy',
    description: 'Don\'t share personal information about others.',
    category: 'privacy',
    severity_if_violated: 'critical',
    examples: [
      'Never share real names, addresses, or phone numbers',
      'Don\'t share private conversations',
      'Respect others\' anonymity'
    ],
    order: 4,
    is_active: true
  },
  {
    title: 'No Spam or Scams',
    description: 'Don\'t spam, advertise, or attempt to scam users.',
    category: 'other',
    severity_if_violated: 'high',
    examples: [
      'Repeated self-promotion in chats',
      'Fake giveaways or scam links',
      'Impersonating staff or other users'
    ],
    order: 5,
    is_active: true
  }
]

// Get community guidelines
export async function getCommunityGuidelines(): Promise<CommunityGuideline[]> {
  const { data, error } = await supabase
    .from('community_guidelines')
    .select('*')
    .eq('is_active', true)
    .order('order', { ascending: true })

  if (error || !data || data.length === 0) {
    // Return default guidelines if DB is empty
    return COMMUNITY_GUIDELINES as unknown as CommunityGuideline[]
  }
  return data
}

// Check if user has accepted current guidelines
export async function hasAcceptedGuidelines(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('guideline_acceptances')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('guideline_version', CURRENT_GUIDELINE_VERSION)

  if (error) return false
  return (count || 0) > 0
}

// Accept community guidelines
export async function acceptGuidelines(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('guideline_acceptances')
    .insert({
      user_id: userId,
      guideline_version: CURRENT_GUIDELINE_VERSION
    })

  if (error) {
    console.error('Error accepting guidelines:', error)
    return false
  }
  return true
}

// ===========================================
// APPEAL SYSTEM
// ===========================================

export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'denied'

export interface Appeal {
  id: string
  user_id: string
  violation_id: string | null
  ban_id: string | null
  appeal_type: 'violation' | 'ban' | 'other'
  reason: string
  evidence: string | null
  status: AppealStatus
  reviewer_id: string | null
  reviewer_notes: string | null
  resolution: string | null
  created_at: string
  reviewed_at: string | null
  // Joined
  user?: Profile
  reviewer?: Profile
  violation?: ContentViolation
}

// Submit an appeal
export async function submitAppeal(
  userId: string,
  appealType: Appeal['appeal_type'],
  reason: string,
  options: {
    violationId?: string
    banId?: string
    evidence?: string
  } = {}
): Promise<Appeal | null> {
  // Check if user already has pending appeal for same item
  const existingQuery = supabase
    .from('appeals')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (options.violationId) {
    existingQuery.eq('violation_id', options.violationId)
  }
  if (options.banId) {
    existingQuery.eq('ban_id', options.banId)
  }

  const { count } = await existingQuery

  if (count && count > 0) {
    console.error('User already has pending appeal for this item')
    return null
  }

  const { data, error } = await supabase
    .from('appeals')
    .insert({
      user_id: userId,
      appeal_type: appealType,
      reason,
      violation_id: options.violationId || null,
      ban_id: options.banId || null,
      evidence: options.evidence || null,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting appeal:', error)
    return null
  }
  return data
}

// Get user's appeals
export async function getUserAppeals(userId: string): Promise<Appeal[]> {
  const { data, error } = await supabase
    .from('appeals')
    .select(`
      *,
      violation:content_violations(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching appeals:', error)
    return []
  }
  return data || []
}

// Get appeal by ID
export async function getAppeal(appealId: string): Promise<Appeal | null> {
  const { data, error } = await supabase
    .from('appeals')
    .select(`
      *,
      user:profiles!appeals_user_id_fkey(id, username, avatar_url),
      reviewer:profiles!appeals_reviewer_id_fkey(id, username),
      violation:content_violations(*)
    `)
    .eq('id', appealId)
    .single()

  if (error) return null
  return data
}

// Review appeal (moderator action)
export async function reviewAppeal(
  appealId: string,
  reviewerId: string,
  decision: 'approved' | 'denied',
  notes: string,
  resolution?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('appeals')
    .update({
      status: decision,
      reviewer_id: reviewerId,
      reviewer_notes: notes,
      resolution: resolution || null,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', appealId)

  if (error) {
    console.error('Error reviewing appeal:', error)
    return false
  }

  // If approved, may need to lift ban or remove violation
  if (decision === 'approved') {
    const appeal = await getAppeal(appealId)
    if (appeal?.violation_id) {
      await supabase
        .from('content_violations')
        .update({ reviewed: true, appealed: true })
        .eq('id', appeal.violation_id)
    }
    if (appeal?.ban_id) {
      await supabase
        .from('user_bans')
        .update({ lifted: true, lifted_at: new Date().toISOString() })
        .eq('id', appeal.ban_id)
    }
  }

  // Notify user
  const appeal = await getAppeal(appealId)
  if (appeal) {
    await supabase.from('notifications').insert({
      user_id: appeal.user_id,
      type: 'appeal_decision',
      title: `Appeal ${decision === 'approved' ? 'Approved' : 'Denied'}`,
      message: decision === 'approved'
        ? 'Your appeal has been approved.'
        : `Your appeal has been denied. ${notes}`,
      data: { appeal_id: appealId }
    })
  }

  return true
}

// Strike system
export interface UserStrikes {
  userId: string
  strikes: number
  maxStrikes: number
  resetDate: string | null
  isBanned: boolean
  banExpires: string | null
}

// Get user's strike count
export async function getUserStrikes(userId: string): Promise<UserStrikes> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const violations = await getViolationCount(userId, 30)

  // Calculate strikes: critical = 3 strikes, high = 2 strikes, medium = 1 strike
  const strikes = (violations.critical * 3) + (violations.high * 2) + violations.medium
  const maxStrikes = 10

  // Check if banned
  const { data: ban } = await supabase
    .from('user_bans')
    .select('*')
    .eq('user_id', userId)
    .eq('lifted', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  return {
    userId,
    strikes: Math.min(strikes, maxStrikes),
    maxStrikes,
    resetDate: new Date(thirtyDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isBanned: !!ban,
    banExpires: ban?.expires_at || null
  }
}

// Auto-ban based on strikes
export async function checkAndApplyBan(userId: string): Promise<boolean> {
  const strikeInfo = await getUserStrikes(userId)

  if (strikeInfo.strikes >= strikeInfo.maxStrikes && !strikeInfo.isBanned) {
    // Apply ban
    const banDuration = 7 // days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + banDuration)

    await supabase.from('user_bans').insert({
      user_id: userId,
      reason: 'Exceeded maximum strikes from content violations',
      expires_at: expiresAt.toISOString(),
      is_permanent: false
    })

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'account_banned',
      title: 'Account Temporarily Banned',
      message: `Your account has been banned for ${banDuration} days due to multiple violations.`,
      data: { ban_duration: banDuration }
    })

    return true
  }

  return false
}
