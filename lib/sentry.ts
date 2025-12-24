/**
 * Sentry Error Tracking Configuration
 *
 * To use:
 * 1. Install: npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in .env
 * 3. Import and call initSentry() in your app
 */

// Type definitions for Sentry (to avoid requiring the package for now)
interface SentryConfig {
  dsn: string
  environment: string
  tracesSampleRate: number
  replaysSessionSampleRate: number
  replaysOnErrorSampleRate: number
  debug: boolean
}

interface BreadcrumbData {
  category: string
  message: string
  level?: 'info' | 'warning' | 'error'
  data?: Record<string, unknown>
}

interface ErrorContext {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  user?: {
    id: string
    username?: string
    email?: string
  }
}

// Mock Sentry object for when package isn't installed
const mockSentry = {
  init: (_config: SentryConfig) => {},
  captureException: (_error: Error, _context?: ErrorContext) => {},
  captureMessage: (_message: string, _level?: string) => {},
  setUser: (_user: ErrorContext['user'] | null) => {},
  setTag: (_key: string, _value: string) => {},
  setExtra: (_key: string, _value: unknown) => {},
  addBreadcrumb: (_breadcrumb: BreadcrumbData) => {},
  startTransaction: (_context: { name: string; op: string }) => ({
    finish: () => {},
    setTag: (_key: string, _value: string) => {},
  }),
}

// Try to get real Sentry or use mock
let Sentry = mockSentry

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

  if (!dsn) {
    console.warn('[Sentry] No DSN provided, error tracking disabled')
    return
  }

  try {
    // Dynamic import of Sentry
    import('@sentry/nextjs').then((SentryModule) => {
      Sentry = SentryModule as typeof mockSentry

      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        debug: process.env.NODE_ENV === 'development',
      })

      console.log('[Sentry] Initialized successfully')
    }).catch((error) => {
      console.warn('[Sentry] Failed to load:', error)
    })
  } catch (error) {
    console.warn('[Sentry] Initialization failed:', error)
  }
}

// Capture exception with context
export function captureError(
  error: Error,
  context?: ErrorContext
): void {
  console.error('[Error]', error.message, context)

  Sentry.captureException(error, context)
}

// Capture message
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.captureMessage(message, level)
}

// Set user context
export function setUser(user: { id: string; username?: string; email?: string } | null): void {
  Sentry.setUser(user)
}

// Add breadcrumb for debugging
export function addBreadcrumb(breadcrumb: BreadcrumbData): void {
  Sentry.addBreadcrumb(breadcrumb)
}

// Set tag for filtering
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value)
}

// Set extra context
export function setExtra(key: string, value: unknown): void {
  Sentry.setExtra(key, value)
}

// Performance monitoring
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op })
}

// Battle-specific error tracking
export function trackBattleError(
  error: Error,
  battleId: string,
  phase: string
): void {
  captureError(error, {
    tags: {
      feature: 'battle',
      battleId,
      phase,
    },
    extra: {
      battleId,
      phase,
      timestamp: new Date().toISOString(),
    },
  })
}

// Audio error tracking
export function trackAudioError(
  error: Error,
  context: { action: string; deviceId?: string }
): void {
  captureError(error, {
    tags: {
      feature: 'audio',
      action: context.action,
    },
    extra: context,
  })
}

// Matchmaking error tracking
export function trackMatchmakingError(
  error: Error,
  userId: string,
  waitTime: number
): void {
  captureError(error, {
    tags: {
      feature: 'matchmaking',
    },
    extra: {
      userId,
      waitTime,
      timestamp: new Date().toISOString(),
    },
  })
}

// API error tracking
export function trackApiError(
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number
): void {
  captureError(error, {
    tags: {
      feature: 'api',
      endpoint,
      method,
    },
    extra: {
      endpoint,
      method,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  })
}

// WebSocket error tracking
export function trackWebSocketError(
  error: Error,
  channel: string,
  event?: string
): void {
  captureError(error, {
    tags: {
      feature: 'websocket',
      channel,
    },
    extra: {
      channel,
      event,
      timestamp: new Date().toISOString(),
    },
  })
}

// Error boundary wrapper for React components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    // This would use Sentry.ErrorBoundary when available
    return <Component {...props} />
  }
}
