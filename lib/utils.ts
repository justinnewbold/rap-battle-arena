import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatElo(elo: number): string {
  return elo.toLocaleString()
}

export function getEloRank(elo: number): { name: string; color: string; icon: string } {
  if (elo >= 2000) return { name: 'Legend', color: 'text-gold-500', icon: '👑' }
  if (elo >= 1800) return { name: 'Master', color: 'text-purple-500', icon: '💎' }
  if (elo >= 1600) return { name: 'Diamond', color: 'text-cyan-400', icon: '💠' }
  if (elo >= 1400) return { name: 'Platinum', color: 'text-slate-300', icon: '⚡' }
  if (elo >= 1200) return { name: 'Gold', color: 'text-yellow-500', icon: '🥇' }
  if (elo >= 1000) return { name: 'Silver', color: 'text-gray-400', icon: '🥈' }
  if (elo >= 800) return { name: 'Bronze', color: 'text-orange-600', icon: '🥉' }
  return { name: 'Rookie', color: 'text-gray-500', icon: '🎤' }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateLong(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function getWinRate(wins: number, losses: number): number {
  const total = wins + losses
  if (total === 0) return 0
  return Math.round((wins / total) * 100)
}

export function getAvatarUrl(username: string, avatarUrl?: string | null): string {
  if (avatarUrl) return avatarUrl
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}&backgroundColor=1a1a1f`
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Validates a room code format
 * Room codes are 6 characters, alphanumeric (excluding confusing chars like 0, O, 1, I)
 */
export function validateRoomCode(code: string): { valid: boolean; error?: string } {
  if (!code) {
    return { valid: false, error: 'Room code is required' }
  }

  // Remove whitespace and convert to uppercase
  const cleaned = code.trim().toUpperCase()

  if (cleaned.length !== 6) {
    return { valid: false, error: 'Room code must be 6 characters' }
  }

  // Valid characters: A-Z (except I, O) and 2-9
  const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/
  if (!validChars.test(cleaned)) {
    return { valid: false, error: 'Room code contains invalid characters' }
  }

  return { valid: true }
}

/**
 * Sanitizes a room code input
 * Removes invalid characters and converts to uppercase
 */
export function sanitizeRoomCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '')
    .slice(0, 6)
}
