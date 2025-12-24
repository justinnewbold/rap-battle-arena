/**
 * Sanitization utilities for user-generated content
 * Prevents XSS attacks and filters inappropriate content
 */

// HTML entity encoding to prevent XSS
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char)
}

// Remove potential script injections
export function removeScripts(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
}

// Sanitize chat message - preserves safe formatting
export function sanitizeChatMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return ''
  }

  // Trim and limit length
  let sanitized = message.trim().slice(0, 500)

  // Remove script tags and event handlers
  sanitized = removeScripts(sanitized)

  // Escape HTML entities
  sanitized = escapeHtml(sanitized)

  // Collapse multiple whitespace
  sanitized = sanitized.replace(/\s+/g, ' ')

  return sanitized
}

// Sanitize username
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    return ''
  }

  // Allow only alphanumeric, underscore, hyphen
  let sanitized = username
    .trim()
    .slice(0, 30)
    .replace(/[^a-zA-Z0-9_-]/g, '')

  // Must start with alphanumeric
  if (sanitized && !/^[a-zA-Z0-9]/.test(sanitized)) {
    sanitized = sanitized.slice(1)
  }

  return sanitized
}

// Profanity filter (basic implementation)
const profanityList = new Set<string>([
  // Add words to filter here
  // This is a minimal example - in production use a proper profanity library
])

// Common profanity obfuscations
const obfuscationPatterns: [RegExp, string][] = [
  [/0/g, 'o'],
  [/1/g, 'i'],
  [/3/g, 'e'],
  [/4/g, 'a'],
  [/5/g, 's'],
  [/@/g, 'a'],
  [/\$/g, 's'],
]

function deobfuscate(text: string): string {
  let result = text.toLowerCase()
  for (const [pattern, replacement] of obfuscationPatterns) {
    result = result.replace(pattern, replacement)
  }
  return result
}

export function containsProfanity(text: string): boolean {
  const normalized = deobfuscate(text)
  const words = normalized.split(/\s+/)

  for (const word of words) {
    if (profanityList.has(word)) {
      return true
    }
  }

  return false
}

export function filterProfanity(text: string): string {
  const words = text.split(/\s+/)
  const normalized = deobfuscate(text).split(/\s+/)

  return words
    .map((word, index) => {
      if (profanityList.has(normalized[index])) {
        return '*'.repeat(word.length)
      }
      return word
    })
    .join(' ')
}

// URL validation and sanitization
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  try {
    const parsed = new URL(url)

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }

    // Remove credentials from URL
    parsed.username = ''
    parsed.password = ''

    return parsed.toString()
  } catch {
    return null
  }
}

// Validate and sanitize room codes
export function sanitizeRoomCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code)
}

// Rate limiting for messages (client-side)
const messageTimestamps: number[] = []
const MESSAGE_LIMIT = 5
const MESSAGE_WINDOW = 10000 // 10 seconds

export function canSendMessage(): boolean {
  const now = Date.now()

  // Remove old timestamps
  while (messageTimestamps.length > 0 && messageTimestamps[0] < now - MESSAGE_WINDOW) {
    messageTimestamps.shift()
  }

  if (messageTimestamps.length >= MESSAGE_LIMIT) {
    return false
  }

  messageTimestamps.push(now)
  return true
}

// Safe JSON parsing
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

// Validate battle content (lyrics)
export function sanitizeLyrics(lyrics: string): string {
  if (!lyrics || typeof lyrics !== 'string') {
    return ''
  }

  // Allow more characters for lyrics but still escape HTML
  let sanitized = lyrics.trim().slice(0, 5000)
  sanitized = removeScripts(sanitized)
  sanitized = escapeHtml(sanitized)

  return sanitized
}

// Content Security Policy nonce generator
export function generateNonce(): string {
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return btoa(String.fromCharCode(...Array.from(array)))
}
