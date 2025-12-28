'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  fallback?: React.ReactNode
  onLoad?: () => void
  onError?: () => void
}

// Default blur placeholder - a tiny gray image
const DEFAULT_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSAyVC08MTY3LjE2O0FBNjpLOzEwR0hHUFVWV1k5P09jWlhZVVZXV1f/2wBDARUXFyAeIB4gHyEgICBXKiAqV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1f/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMH/8QAGxAAAwACAwAAAAAAAAAAAAAAAAECAwQREiH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBf/EABcRAQEBAQAAAAAAAAAAAAAAAAEAESH/2gAMAwEAAhEDEQA/ALGBZqWJFq6n0AA14kf/2Q=='

// Generate responsive sizes for common use cases
const COMMON_SIZES = {
  avatar: '(max-width: 640px) 48px, (max-width: 1024px) 64px, 80px',
  thumbnail: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px',
  hero: '100vw',
  full: '100vw',
}

/**
 * Optimized image component with automatic WebP conversion,
 * blur placeholder, and responsive sizing
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes = COMMON_SIZES.card,
  quality = 80,
  placeholder = 'blur',
  blurDataURL = DEFAULT_BLUR_DATA_URL,
  fallback,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Reset error state when src changes
  useEffect(() => {
    setError(false)
    setLoaded(false)
  }, [src])

  // Handle missing or invalid src
  if (!src || error) {
    if (fallback) {
      return <>{fallback}</>
    }

    // Default fallback - placeholder div
    return (
      <div
        className={cn(
          'bg-dark-700 flex items-center justify-center',
          className
        )}
        style={!fill ? { width, height } : undefined}
      >
        <svg
          className="w-1/3 h-1/3 text-dark-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  // Check if src is an external URL
  const isExternal = src.startsWith('http://') || src.startsWith('https://')

  return (
    <div className={cn('relative overflow-hidden', !fill && 'inline-block')}>
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={cn(
          'transition-opacity duration-300',
          !loaded && 'opacity-0',
          loaded && 'opacity-100',
          className
        )}
        onLoad={() => {
          setLoaded(true)
          onLoad?.()
        }}
        onError={() => {
          setError(true)
          onError?.()
        }}
        // Allow external images (configure in next.config.js)
        unoptimized={isExternal && !src.includes('supabase')}
      />
    </div>
  )
}

/**
 * Optimized avatar component with proper sizing
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  className,
}: {
  src: string | null | undefined
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  }

  const dimension = sizeMap[size]

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      sizes={COMMON_SIZES.avatar}
      className={cn('rounded-full object-cover', className)}
      quality={90}
      fallback={
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-fire-500 to-purple-500 flex items-center justify-center text-white font-bold',
            className
          )}
          style={{ width: dimension, height: dimension }}
        >
          {alt.charAt(0).toUpperCase()}
        </div>
      }
    />
  )
}

/**
 * Background image with overlay support
 */
export function OptimizedBackground({
  src,
  alt,
  className,
  overlayClassName,
  children,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  overlayClassName?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('relative', className)}>
      {src && (
        <OptimizedImage
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      )}
      {overlayClassName && (
        <div className={cn('absolute inset-0', overlayClassName)} />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export { COMMON_SIZES }
