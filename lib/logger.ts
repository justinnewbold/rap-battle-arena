/**
 * Structured logging and observability utilities
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  correlationId?: string
  userId?: string
  path?: string
  duration?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
}

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Current log level (can be set via environment)
const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel]
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'development') {
    // Pretty format for development
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[90m', // Gray
      info: '\x1b[36m',  // Cyan
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    }
    const reset = '\x1b[0m'
    const level = `${levelColors[entry.level]}[${entry.level.toUpperCase()}]${reset}`

    let output = `${entry.timestamp} ${level} ${entry.message}`

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${JSON.stringify(entry.context)}`
    }

    if (entry.error) {
      output += `\n${entry.error.stack || entry.error.message}`
    }

    return output
  }

  // JSON format for production (structured logging)
  return JSON.stringify(entry)
}

/**
 * Create a log entry and output it
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): void {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context) {
    entry.context = context
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  const output = formatLogEntry(entry)

  switch (level) {
    case 'error':
      console.error(output)
      break
    case 'warn':
      console.warn(output)
      break
    default:
      console.log(output)
  }
}

/**
 * Logger instance with all log methods
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const err = error instanceof Error ? error : undefined
    log('error', message, context, err)
  },
}

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a scoped logger with default context
 */
export function createScopedLogger(scope: string, defaultContext?: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(`[${scope}] ${message}`, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(`[${scope}] ${message}`, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(`[${scope}] ${message}`, { ...defaultContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(`[${scope}] ${message}`, error, { ...defaultContext, ...context }),
  }
}

/**
 * Request logging middleware
 */
export function logRequest(
  request: Request,
  correlationId: string
): { logResponse: (response: Response, duration: number) => void } {
  const url = new URL(request.url)

  logger.info('Incoming request', {
    correlationId,
    method: request.method,
    path: url.pathname,
    query: url.search,
    userAgent: request.headers.get('user-agent'),
  })

  return {
    logResponse: (response: Response, duration: number) => {
      const level: LogLevel = response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info'

      log(level, 'Request completed', {
        correlationId,
        method: request.method,
        path: url.pathname,
        status: response.status,
        duration: `${duration}ms`,
      })
    },
  }
}

/**
 * Error aggregation - collect and categorize errors
 */
interface ErrorStats {
  count: number
  firstSeen: string
  lastSeen: string
  samples: Array<{
    timestamp: string
    message: string
    stack?: string
  }>
}

const errorAggregator = new Map<string, ErrorStats>()

export function aggregateError(error: Error, context?: LogContext): void {
  const key = `${error.name}:${error.message}`
  const now = new Date().toISOString()

  const existing = errorAggregator.get(key)

  if (existing) {
    existing.count++
    existing.lastSeen = now
    if (existing.samples.length < 5) {
      existing.samples.push({
        timestamp: now,
        message: error.message,
        stack: error.stack,
      })
    }
    errorAggregator.set(key, existing)
  } else {
    errorAggregator.set(key, {
      count: 1,
      firstSeen: now,
      lastSeen: now,
      samples: [
        {
          timestamp: now,
          message: error.message,
          stack: error.stack,
        },
      ],
    })
  }

  logger.error('Error occurred', error, context)
}

export function getErrorStats(): Map<string, ErrorStats> {
  return new Map(errorAggregator)
}

export function clearErrorStats(): void {
  errorAggregator.clear()
}

/**
 * Health check status
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: Record<
    string,
    {
      status: 'pass' | 'warn' | 'fail'
      message?: string
      duration?: number
    }
  >
}

export async function checkHealth(
  checks: Record<string, () => Promise<boolean>>
): Promise<HealthStatus> {
  const results: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  }

  for (const [name, check] of Object.entries(checks)) {
    const start = Date.now()
    try {
      const passed = await check()
      results.checks[name] = {
        status: passed ? 'pass' : 'warn',
        duration: Date.now() - start,
      }
      if (!passed && results.status === 'healthy') {
        results.status = 'degraded'
      }
    } catch (error) {
      results.checks[name] = {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start,
      }
      results.status = 'unhealthy'
    }
  }

  return results
}
