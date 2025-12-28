import OpenAI from 'openai'

export interface ModerationResult {
  flagged: boolean
  categories: {
    hate: boolean
    'hate/threatening': boolean
    harassment: boolean
    'harassment/threatening': boolean
    'self-harm': boolean
    'self-harm/intent': boolean
    'self-harm/instructions': boolean
    sexual: boolean
    'sexual/minors': boolean
    violence: boolean
    'violence/graphic': boolean
  }
  categoryScores: {
    hate: number
    'hate/threatening': number
    harassment: number
    'harassment/threatening': number
    'self-harm': number
    'self-harm/intent': number
    'self-harm/instructions': number
    sexual: number
    'sexual/minors': number
    violence: number
    'violence/graphic': number
  }
  action: 'allow' | 'warn' | 'block'
  reason?: string
}

// Thresholds for different moderation actions
const THRESHOLDS = {
  // Immediate block - zero tolerance
  block: {
    'sexual/minors': 0.01,
    'self-harm/instructions': 0.5,
    'violence/graphic': 0.7,
  },
  // Warning thresholds
  warn: {
    hate: 0.5,
    harassment: 0.6,
    'self-harm': 0.5,
    sexual: 0.7,
    violence: 0.6,
  },
}

/**
 * Moderate text content using OpenAI's moderation API
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.warn('OpenAI API key not configured, skipping moderation')
    return {
      flagged: false,
      categories: {} as ModerationResult['categories'],
      categoryScores: {} as ModerationResult['categoryScores'],
      action: 'allow',
    }
  }

  const openai = new OpenAI({ apiKey })

  try {
    const response = await openai.moderations.create({
      input: text,
    })

    const result = response.results[0]
    const categories = result.categories as unknown as ModerationResult['categories']
    const categoryScores = result.category_scores as unknown as ModerationResult['categoryScores']

    // Determine action based on thresholds
    let action: 'allow' | 'warn' | 'block' = 'allow'
    let reason: string | undefined

    // Check for immediate blocks
    for (const [category, threshold] of Object.entries(THRESHOLDS.block)) {
      const score = categoryScores[category as keyof typeof categoryScores]
      if (score >= threshold) {
        action = 'block'
        reason = `Content violates ${category.replace('/', ' ')} policy`
        break
      }
    }

    // Check for warnings if not blocked
    if (action !== 'block') {
      for (const [category, threshold] of Object.entries(THRESHOLDS.warn)) {
        const score = categoryScores[category as keyof typeof categoryScores]
        if (score >= threshold) {
          action = 'warn'
          reason = `Content may contain ${category} elements`
          break
        }
      }
    }

    return {
      flagged: result.flagged,
      categories,
      categoryScores,
      action,
      reason,
    }
  } catch (error) {
    console.error('Moderation API error:', error)
    // Fail open - allow content if moderation fails
    return {
      flagged: false,
      categories: {} as ModerationResult['categories'],
      categoryScores: {} as ModerationResult['categoryScores'],
      action: 'allow',
    }
  }
}

/**
 * Check if text contains spam patterns
 */
export function checkSpam(text: string): { isSpam: boolean; reason?: string } {
  // Check for repeated characters
  if (/(.)\1{10,}/.test(text)) {
    return { isSpam: true, reason: 'Repeated characters detected' }
  }

  // Check for all caps (if longer than 20 chars)
  if (text.length > 20 && text === text.toUpperCase()) {
    return { isSpam: true, reason: 'Excessive caps detected' }
  }

  // Check for repeated words
  const words = text.toLowerCase().split(/\s+/)
  const wordCounts = new Map<string, number>()
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
  })

  let spamDetected = false
  wordCounts.forEach((count, word) => {
    if (word.length > 2 && count > 5) {
      spamDetected = true
    }
  })
  if (spamDetected) {
    return { isSpam: true, reason: 'Repeated word spam detected' }
  }

  // Check for URL spam
  const urlCount = (text.match(/https?:\/\//gi) || []).length
  if (urlCount > 2) {
    return { isSpam: true, reason: 'Too many URLs' }
  }

  return { isSpam: false }
}

/**
 * Filter profanity with asterisks (light filter for display)
 * Note: This is a basic filter - real implementation would use a proper word list
 */
export function filterProfanity(text: string): string {
  // Basic word list - in production, use a comprehensive library
  const profanityPatterns = [
    /\b(f+u+c+k+)\b/gi,
    /\b(s+h+i+t+)\b/gi,
    /\b(a+s+s+h+o+l+e+)\b/gi,
    /\b(b+i+t+c+h+)\b/gi,
  ]

  let filtered = text
  for (const pattern of profanityPatterns) {
    filtered = filtered.replace(pattern, (match) =>
      match[0] + '*'.repeat(match.length - 2) + match[match.length - 1]
    )
  }

  return filtered
}

// Profanity detection for battle rap context
// More lenient since battle rap culture uses strong language
export interface BattleRapModerationResult {
  allowed: boolean
  warnings: string[]
  blockedReasons: string[]
}

export function moderateBattleRapContent(transcript: string): BattleRapModerationResult {
  const warnings: string[] = []
  const blockedReasons: string[] = []

  // Check for truly unacceptable content (not just strong language)
  const blockedPatterns = [
    { pattern: /\b(kill\s+(yourself|urself))\b/i, reason: 'Self-harm encouragement' },
    { pattern: /\b(go\s+die)\b/i, reason: 'Harmful content' },
    { pattern: /\b(bomb|terrorist|terrorism)\b/i, reason: 'Violent threats' },
    { pattern: /\b(n[i1]gg[ae]r)\b/i, reason: 'Racial slur' },
  ]

  for (const { pattern, reason } of blockedPatterns) {
    if (pattern.test(transcript)) {
      blockedReasons.push(reason)
    }
  }

  // Warning patterns (allowed but flagged)
  const warningPatterns = [
    { pattern: /\b(suicide|suicidal)\b/i, warning: 'Sensitive topic mentioned' },
    { pattern: /\b(rape|rapist)\b/i, warning: 'Sensitive topic mentioned' },
  ]

  for (const { pattern, warning } of warningPatterns) {
    if (pattern.test(transcript) && !warnings.includes(warning)) {
      warnings.push(warning)
    }
  }

  return {
    allowed: blockedReasons.length === 0,
    warnings,
    blockedReasons,
  }
}

/**
 * Rate limit for moderation API calls
 */
const moderationRateLimit = new Map<string, { count: number; resetAt: number }>()

export function checkModerationRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = moderationRateLimit.get(userId)

  if (!limit || now > limit.resetAt) {
    moderationRateLimit.set(userId, { count: 1, resetAt: now + 60000 })
    return true
  }

  if (limit.count >= 10) {
    return false
  }

  limit.count++
  return true
}
