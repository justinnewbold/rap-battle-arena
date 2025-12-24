'use client'

import { useEffect, useCallback, useRef } from 'react'

type KeyHandler = (event: KeyboardEvent) => void

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  handler: KeyHandler
  description?: string
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  scope?: string
}

// Global shortcut registry for help display
const shortcutRegistry = new Map<string, ShortcutConfig[]>()

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, scope = 'global' } = options
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    // Register shortcuts for help display
    shortcutRegistry.set(scope, shortcuts)

    return () => {
      shortcutRegistry.delete(scope)
    }
  }, [scope, shortcuts])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcutsRef.current) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler(event)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled])
}

// Get all registered shortcuts
export function getRegisteredShortcuts(): Map<string, ShortcutConfig[]> {
  return shortcutRegistry
}

// Format shortcut for display
export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = []

  if (config.ctrl) parts.push('Ctrl')
  if (config.alt) parts.push('Alt')
  if (config.shift) parts.push('Shift')
  if (config.meta) parts.push('Cmd')

  // Format special keys
  const keyDisplay = {
    ' ': 'Space',
    'escape': 'Esc',
    'enter': 'Enter',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
  }[config.key.toLowerCase()] || config.key.toUpperCase()

  parts.push(keyDisplay)

  return parts.join(' + ')
}

// Pre-built shortcuts for common actions
export function useBattleShortcuts(handlers: {
  onStartRecording?: () => void
  onStopRecording?: () => void
  onSkip?: () => void
  onMute?: () => void
  onExit?: () => void
}) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: ' ',
      handler: () => {
        if (handlers.onStartRecording) handlers.onStartRecording()
      },
      description: 'Start/stop recording',
    },
    {
      key: 's',
      handler: () => {
        if (handlers.onSkip) handlers.onSkip()
      },
      description: 'Skip turn',
    },
    {
      key: 'm',
      handler: () => {
        if (handlers.onMute) handlers.onMute()
      },
      description: 'Toggle mute',
    },
    {
      key: 'Escape',
      handler: () => {
        if (handlers.onExit) handlers.onExit()
      },
      description: 'Exit battle',
    },
  ]

  useKeyboardShortcuts(shortcuts, { scope: 'battle' })
}

export function useVotingShortcuts(handlers: {
  onVotePlayer1?: () => void
  onVotePlayer2?: () => void
}) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: '1',
      handler: () => {
        if (handlers.onVotePlayer1) handlers.onVotePlayer1()
      },
      description: 'Vote for Player 1',
    },
    {
      key: '2',
      handler: () => {
        if (handlers.onVotePlayer2) handlers.onVotePlayer2()
      },
      description: 'Vote for Player 2',
    },
  ]

  useKeyboardShortcuts(shortcuts, { scope: 'voting' })
}

export function useNavigationShortcuts(handlers: {
  onGoBack?: () => void
  onGoHome?: () => void
  onToggleHelp?: () => void
}) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'Backspace',
      handler: () => {
        if (handlers.onGoBack) handlers.onGoBack()
      },
      description: 'Go back',
    },
    {
      key: 'h',
      handler: () => {
        if (handlers.onGoHome) handlers.onGoHome()
      },
      description: 'Go to dashboard',
    },
    {
      key: '?',
      shift: true,
      handler: () => {
        if (handlers.onToggleHelp) handlers.onToggleHelp()
      },
      description: 'Show keyboard shortcuts',
    },
  ]

  useKeyboardShortcuts(shortcuts, { scope: 'navigation' })
}
