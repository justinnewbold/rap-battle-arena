'use client'

import { Crown, Star, Zap } from 'lucide-react'
import { PremiumTier, getPremiumBadge } from '@/lib/premium'
import { cn } from '@/lib/utils'

interface PremiumBadgeProps {
  tier: PremiumTier
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export default function PremiumBadge({ tier, size = 'md', showLabel = false, className }: PremiumBadgeProps) {
  if (tier === 'free') return null

  const badge = getPremiumBadge(tier)
  if (!badge) return null

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  }

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  const Icon = tier === 'elite' ? Crown : tier === 'pro' ? Star : Zap

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold rounded-full",
        sizeClasses[size],
        tier === 'plus' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        tier === 'pro' && 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
        tier === 'elite' && 'bg-gradient-to-r from-gold-500/20 to-gold-600/20 text-gold-400 border border-gold-500/30',
        className
      )}
    >
      <Icon className={iconSize[size]} />
      {showLabel && badge.badge}
    </span>
  )
}
