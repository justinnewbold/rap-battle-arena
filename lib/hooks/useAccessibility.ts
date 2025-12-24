'use client'

import { useEffect, useCallback, useRef, useState } from 'react'

// Screen reader announcements
const announcerStyles = {
  position: 'absolute' as const,
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  border: '0',
}

let announcer: HTMLDivElement | null = null

function getAnnouncer(): HTMLDivElement {
  if (typeof document === 'undefined') {
    throw new Error('Cannot use announcer on server')
  }

  if (!announcer) {
    announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.setAttribute('role', 'status')
    Object.assign(announcer.style, announcerStyles)
    document.body.appendChild(announcer)
  }

  return announcer
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (typeof document === 'undefined') return

  const el = getAnnouncer()
  el.setAttribute('aria-live', priority)

  // Clear and re-announce to ensure screen readers pick it up
  el.textContent = ''
  setTimeout(() => {
    el.textContent = message
  }, 100)
}

// Focus management
export function useFocusTrap(active: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    previousFocus.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element
    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      previousFocus.current?.focus()
    }
  }, [active])

  return containerRef
}

// Skip to content link
export function useSkipToContent() {
  const handleSkip = useCallback(() => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]')
    if (main instanceof HTMLElement) {
      main.setAttribute('tabindex', '-1')
      main.focus()
      main.removeAttribute('tabindex')
    }
  }, [])

  return handleSkip
}

// Focus visible detection
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsFocusVisible(true)
      }
    }

    const handleMouseDown = () => {
      setIsFocusVisible(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  return isFocusVisible
}

// Reduced motion preference
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return reducedMotion
}

// High contrast mode detection
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)')
    setHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return highContrast
}

// Roving tabindex for list navigation
export function useRovingTabIndex<T extends HTMLElement>(
  items: React.RefObject<T>[]
) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newIndex = focusedIndex

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          newIndex = (focusedIndex + 1) % items.length
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          newIndex = (focusedIndex - 1 + items.length) % items.length
          break
        case 'Home':
          e.preventDefault()
          newIndex = 0
          break
        case 'End':
          e.preventDefault()
          newIndex = items.length - 1
          break
        default:
          return
      }

      setFocusedIndex(newIndex)
      items[newIndex]?.current?.focus()
    },
    [focusedIndex, items]
  )

  const getTabIndex = useCallback(
    (index: number) => (index === focusedIndex ? 0 : -1),
    [focusedIndex]
  )

  return { handleKeyDown, getTabIndex, focusedIndex, setFocusedIndex }
}

// Live region for dynamic updates
export function useLiveRegion() {
  const regionRef = useRef<HTMLDivElement>(null)

  const update = useCallback((message: string) => {
    if (regionRef.current) {
      regionRef.current.textContent = message
    }
  }, [])

  const clear = useCallback(() => {
    if (regionRef.current) {
      regionRef.current.textContent = ''
    }
  }, [])

  return { regionRef, update, clear }
}

// Battle-specific accessibility announcements
export function useBattleAnnouncements() {
  const announcePhase = useCallback((phase: string) => {
    const messages: Record<string, string> = {
      countdown: 'Battle starting in 3 seconds',
      player1_turn: 'Player 1 turn. Start rapping!',
      player2_turn: 'Player 2 turn. Start rapping!',
      judging: 'AI is judging the battle',
      results: 'Battle complete. Results are in!',
    }

    if (messages[phase]) {
      announce(messages[phase], 'assertive')
    }
  }, [])

  const announceTimer = useCallback((seconds: number) => {
    if (seconds === 30 || seconds === 10 || seconds <= 5) {
      announce(`${seconds} seconds remaining`, 'polite')
    }
  }, [])

  const announceRecording = useCallback((isRecording: boolean) => {
    announce(
      isRecording ? 'Recording started' : 'Recording stopped',
      'assertive'
    )
  }, [])

  const announceVote = useCallback((winner: string) => {
    announce(`Vote cast for ${winner}`, 'polite')
  }, [])

  return {
    announcePhase,
    announceTimer,
    announceRecording,
    announceVote,
  }
}
