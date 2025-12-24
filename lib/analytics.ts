/**
 * Analytics Tracking Module
 *
 * Supports multiple providers: Google Analytics, Mixpanel, Amplitude, etc.
 * Configure via environment variables:
 * - NEXT_PUBLIC_GA_ID: Google Analytics measurement ID
 * - NEXT_PUBLIC_MIXPANEL_TOKEN: Mixpanel project token
 */

type EventProperties = Record<string, string | number | boolean | null>

interface AnalyticsProvider {
  name: string
  init: () => void
  track: (event: string, properties?: EventProperties) => void
  identify: (userId: string, traits?: EventProperties) => void
  page: (name: string, properties?: EventProperties) => void
  reset: () => void
}

// Google Analytics 4 provider
const googleAnalyticsProvider: AnalyticsProvider = {
  name: 'google-analytics',

  init() {
    const gaId = process.env.NEXT_PUBLIC_GA_ID
    if (!gaId) return

    // Load gtag script
    if (typeof window !== 'undefined' && !window.gtag) {
      const script = document.createElement('script')
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
      script.async = true
      document.head.appendChild(script)

      window.dataLayer = window.dataLayer || []
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer.push(args)
      }
      window.gtag('js', new Date())
      window.gtag('config', gaId, {
        page_path: window.location.pathname,
      })
    }
  },

  track(event: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, properties)
    }
  },

  identify(userId: string) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        user_id: userId,
      })
    }
  },

  page(name: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: name,
        page_location: window.location.href,
        page_path: window.location.pathname,
        ...properties,
      })
    }
  },

  reset() {
    // GA doesn't have a built-in reset
  },
}

// Console provider for development
const consoleProvider: AnalyticsProvider = {
  name: 'console',

  init() {
    console.log('[Analytics] Console provider initialized')
  },

  track(event: string, properties?: EventProperties) {
    console.log('[Analytics] Track:', event, properties)
  },

  identify(userId: string, traits?: EventProperties) {
    console.log('[Analytics] Identify:', userId, traits)
  },

  page(name: string, properties?: EventProperties) {
    console.log('[Analytics] Page:', name, properties)
  },

  reset() {
    console.log('[Analytics] Reset')
  },
}

// Active providers
const providers: AnalyticsProvider[] = []

// Initialize analytics
export function initAnalytics() {
  if (typeof window === 'undefined') return

  // Add console provider in development
  if (process.env.NODE_ENV === 'development') {
    providers.push(consoleProvider)
  }

  // Add Google Analytics if configured
  if (process.env.NEXT_PUBLIC_GA_ID) {
    providers.push(googleAnalyticsProvider)
  }

  // Initialize all providers
  providers.forEach((provider) => {
    try {
      provider.init()
    } catch (error) {
      console.error(`[Analytics] Failed to init ${provider.name}:`, error)
    }
  })
}

// Track event
export function track(event: string, properties?: EventProperties) {
  providers.forEach((provider) => {
    try {
      provider.track(event, properties)
    } catch (error) {
      console.error(`[Analytics] Track error in ${provider.name}:`, error)
    }
  })
}

// Identify user
export function identify(userId: string, traits?: EventProperties) {
  providers.forEach((provider) => {
    try {
      provider.identify(userId, traits)
    } catch (error) {
      console.error(`[Analytics] Identify error in ${provider.name}:`, error)
    }
  })
}

// Track page view
export function page(name: string, properties?: EventProperties) {
  providers.forEach((provider) => {
    try {
      provider.page(name, properties)
    } catch (error) {
      console.error(`[Analytics] Page error in ${provider.name}:`, error)
    }
  })
}

// Reset user (on logout)
export function reset() {
  providers.forEach((provider) => {
    try {
      provider.reset()
    } catch (error) {
      console.error(`[Analytics] Reset error in ${provider.name}:`, error)
    }
  })
}

// Pre-defined events for the app
export const Events = {
  // Auth events
  SIGN_UP: 'sign_up',
  SIGN_IN: 'sign_in',
  SIGN_OUT: 'sign_out',

  // Battle events
  BATTLE_START: 'battle_start',
  BATTLE_END: 'battle_end',
  BATTLE_WIN: 'battle_win',
  BATTLE_LOSE: 'battle_lose',
  BATTLE_DRAW: 'battle_draw',
  BATTLE_FORFEIT: 'battle_forfeit',

  // Matchmaking events
  MATCHMAKING_START: 'matchmaking_start',
  MATCHMAKING_FOUND: 'matchmaking_found',
  MATCHMAKING_CANCEL: 'matchmaking_cancel',
  MATCHMAKING_TIMEOUT: 'matchmaking_timeout',

  // Recording events
  RECORDING_START: 'recording_start',
  RECORDING_END: 'recording_end',
  RECORDING_SKIP: 'recording_skip',

  // Voting events
  VOTE_CAST: 'vote_cast',
  VOTE_RECEIVED: 'vote_received',

  // Social events
  CHAT_MESSAGE: 'chat_message',
  SPECTATE_JOIN: 'spectate_join',
  SPECTATE_LEAVE: 'spectate_leave',

  // Feature usage
  TUTORIAL_START: 'tutorial_start',
  TUTORIAL_COMPLETE: 'tutorial_complete',
  TUTORIAL_SKIP: 'tutorial_skip',
  PRACTICE_MODE_START: 'practice_mode_start',
  THEME_CHANGE: 'theme_change',
  KEYBOARD_SHORTCUT_USED: 'keyboard_shortcut_used',
} as const

// Track battle completion
export function trackBattleComplete(
  battleId: string,
  result: 'win' | 'lose' | 'draw',
  duration: number,
  rounds: number
) {
  const event = result === 'win' ? Events.BATTLE_WIN :
                result === 'lose' ? Events.BATTLE_LOSE :
                Events.BATTLE_DRAW

  track(event, {
    battle_id: battleId,
    duration_seconds: Math.round(duration / 1000),
    rounds,
  })

  track(Events.BATTLE_END, {
    battle_id: battleId,
    result,
    duration_seconds: Math.round(duration / 1000),
    rounds,
  })
}

// Track matchmaking
export function trackMatchmaking(
  action: 'start' | 'found' | 'cancel' | 'timeout',
  waitTime?: number
) {
  const eventMap = {
    start: Events.MATCHMAKING_START,
    found: Events.MATCHMAKING_FOUND,
    cancel: Events.MATCHMAKING_CANCEL,
    timeout: Events.MATCHMAKING_TIMEOUT,
  }

  track(eventMap[action], {
    wait_time_seconds: waitTime ? Math.round(waitTime / 1000) : null,
  })
}

// Track recording
export function trackRecording(
  action: 'start' | 'end' | 'skip',
  duration?: number
) {
  const eventMap = {
    start: Events.RECORDING_START,
    end: Events.RECORDING_END,
    skip: Events.RECORDING_SKIP,
  }

  track(eventMap[action], {
    duration_seconds: duration ? Math.round(duration / 1000) : null,
  })
}

// Type declarations for window
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}
