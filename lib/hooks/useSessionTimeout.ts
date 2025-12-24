'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UseSessionTimeoutOptions {
  timeout?: number // in milliseconds
  warningTime?: number // time before timeout to show warning
  onTimeout?: () => void
  onWarning?: (remainingTime: number) => void
  enabled?: boolean
}

const DEFAULT_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const DEFAULT_WARNING = 5 * 60 * 1000 // 5 minutes before timeout

export function useSessionTimeout({
  timeout = DEFAULT_TIMEOUT,
  warningTime = DEFAULT_WARNING,
  onTimeout,
  onWarning,
  enabled = true,
}: UseSessionTimeoutOptions = {}) {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
      warningRef.current = null
    }
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current)
      warningIntervalRef.current = null
    }
  }, [])

  const handleTimeout = useCallback(() => {
    clearTimers()
    setShowWarning(false)

    if (onTimeout) {
      onTimeout()
    } else {
      // Default: redirect to login
      router.push('/login?reason=timeout')
    }
  }, [clearTimers, onTimeout, router])

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true)
    const endTime = lastActivityRef.current + timeout

    warningIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now())
      setRemainingTime(remaining)

      if (onWarning) {
        onWarning(remaining)
      }

      if (remaining === 0) {
        if (warningIntervalRef.current) {
          clearInterval(warningIntervalRef.current)
        }
      }
    }, 1000)
  }, [timeout, onWarning])

  const resetTimeout = useCallback(() => {
    if (!enabled) return

    clearTimers()
    setShowWarning(false)
    lastActivityRef.current = Date.now()

    // Set warning timer
    warningRef.current = setTimeout(() => {
      startWarningCountdown()
    }, timeout - warningTime)

    // Set timeout timer
    timeoutRef.current = setTimeout(handleTimeout, timeout)
  }, [enabled, clearTimers, timeout, warningTime, startWarningCountdown, handleTimeout])

  const extendSession = useCallback(() => {
    resetTimeout()
  }, [resetTimeout])

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) return

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    // Debounced activity handler
    let activityTimeout: NodeJS.Timeout | null = null
    const handleActivity = () => {
      if (activityTimeout) return

      activityTimeout = setTimeout(() => {
        activityTimeout = null
        resetTimeout()
      }, 1000)
    }

    // Add listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Initial timeout setup
    resetTimeout()

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      if (activityTimeout) {
        clearTimeout(activityTimeout)
      }
      clearTimers()
    }
  }, [enabled, resetTimeout, clearTimers])

  // Check for session on tab visibility change
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityRef.current

        if (elapsed >= timeout) {
          handleTimeout()
        } else if (elapsed >= timeout - warningTime) {
          startWarningCountdown()
        } else {
          resetTimeout()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, timeout, warningTime, handleTimeout, startWarningCountdown, resetTimeout])

  return {
    showWarning,
    remainingTime,
    extendSession,
    formatRemainingTime: () => {
      const minutes = Math.floor(remainingTime / 60000)
      const seconds = Math.floor((remainingTime % 60000) / 1000)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    },
  }
}

// Session timeout warning modal component props
export interface SessionTimeoutWarningProps {
  remainingTime: string
  onExtend: () => void
  onLogout: () => void
}
