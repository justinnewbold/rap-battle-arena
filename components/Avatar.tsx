'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src: string
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  priority?: boolean
  borderColor?: 'fire' | 'ice' | 'gold' | 'default'
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 96,
}

const borderColorMap = {
  fire: 'border-fire-500',
  ice: 'border-ice-500',
  gold: 'border-gold-500',
  default: 'border-dark-600',
}

export function Avatar({
  src,
  alt,
  size = 'md',
  className,
  priority = false,
  borderColor = 'default',
}: AvatarProps) {
  const [error, setError] = useState(false)
  const dimension = sizeMap[size]

  // Fallback to dicebear avatar if image fails to load
  const fallbackSrc = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(alt)}&backgroundColor=1a1a1f`

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden border-2 shrink-0',
        borderColorMap[borderColor],
        className
      )}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={error ? fallbackSrc : src}
        alt={alt}
        width={dimension}
        height={dimension}
        priority={priority}
        className="object-cover"
        onError={() => setError(true)}
        unoptimized={src.includes('dicebear.com')} // SVGs don't need optimization
      />
    </div>
  )
}

interface AvatarGroupProps {
  avatars: Array<{ src: string; alt: string }>
  max?: number
  size?: AvatarProps['size']
}

export function AvatarGroup({ avatars, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = avatars.slice(0, max)
  const remaining = avatars.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          alt={avatar.alt}
          size={size}
          className="ring-2 ring-dark-900"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-dark-700 text-xs font-bold ring-2 ring-dark-900',
            size === 'sm' && 'w-8 h-8',
            size === 'md' && 'w-10 h-10'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
