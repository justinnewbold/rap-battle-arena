'use client'

import { useEffect, useCallback } from 'react'

interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number  // Largest Contentful Paint
  FID?: number  // First Input Delay
  CLS?: number  // Cumulative Layout Shift
  FCP?: number  // First Contentful Paint
  TTFB?: number // Time to First Byte

  // Custom metrics
  pageLoadTime?: number
  domInteractive?: number
  domComplete?: number
}

interface PerformanceReport {
  url: string
  timestamp: number
  metrics: PerformanceMetrics
  userAgent: string
}

/**
 * Hook to monitor page performance and Core Web Vitals
 */
export function usePerformanceMonitor(options?: {
  onReport?: (report: PerformanceReport) => void
  reportToConsole?: boolean
}) {
  const { onReport, reportToConsole = false } = options || {}

  const collectMetrics = useCallback((): PerformanceMetrics => {
    const metrics: PerformanceMetrics = {}

    if (typeof window === 'undefined' || !window.performance) {
      return metrics
    }

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      metrics.TTFB = navigation.responseStart - navigation.requestStart
      metrics.domInteractive = navigation.domInteractive
      metrics.domComplete = navigation.domComplete
      metrics.pageLoadTime = navigation.loadEventEnd - navigation.startTime
    }

    // Paint timing
    const paintEntries = performance.getEntriesByType('paint')
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        metrics.FCP = entry.startTime
      }
    })

    return metrics
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Observe Largest Contentful Paint
    let lcpValue: number | undefined

    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      lcpValue = lastEntry?.startTime
    })

    // Observe Cumulative Layout Shift
    let clsValue = 0

    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        // @ts-expect-error - hadRecentInput is not in types
        if (!entry.hadRecentInput) {
          // @ts-expect-error - value is not in types
          clsValue += entry.value
        }
      }
    })

    // Observe First Input Delay
    let fidValue: number | undefined

    const fidObserver = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0]
      if (firstInput) {
        // @ts-expect-error - processingStart is not in types
        fidValue = firstInput.processingStart - firstInput.startTime
      }
    })

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
      fidObserver.observe({ type: 'first-input', buffered: true })
    } catch {
      // Observer types may not be supported in all browsers
    }

    // Report metrics on page unload or after initial load
    const reportMetrics = () => {
      const metrics = collectMetrics()

      if (lcpValue !== undefined) metrics.LCP = lcpValue
      if (fidValue !== undefined) metrics.FID = fidValue
      if (clsValue > 0) metrics.CLS = clsValue

      const report: PerformanceReport = {
        url: window.location.pathname,
        timestamp: Date.now(),
        metrics,
        userAgent: navigator.userAgent,
      }

      if (reportToConsole) {
        console.log('[Performance]', report)
      }

      onReport?.(report)
    }

    // Track timeout for cleanup
    let loadTimeout: ReturnType<typeof setTimeout> | null = null

    // Report after load event
    const handleLoad = () => {
      // Wait a bit for LCP to finalize
      loadTimeout = setTimeout(reportMetrics, 3000)
    }

    // Also report on visibility change (tab close/switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportMetrics()
      }
    }

    window.addEventListener('load', handleLoad)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      lcpObserver.disconnect()
      clsObserver.disconnect()
      fidObserver.disconnect()
      window.removeEventListener('load', handleLoad)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (loadTimeout) {
        clearTimeout(loadTimeout)
      }
    }
  }, [collectMetrics, onReport, reportToConsole])
}

/**
 * Utility to measure component render time
 */
export function measureRenderTime(componentName: string) {
  if (typeof window === 'undefined' || !window.performance) {
    return { start: () => {}, end: () => {} }
  }

  const markName = `${componentName}-render`

  return {
    start: () => {
      performance.mark(`${markName}-start`)
    },
    end: () => {
      performance.mark(`${markName}-end`)
      try {
        performance.measure(markName, `${markName}-start`, `${markName}-end`)
        const measure = performance.getEntriesByName(markName)[0]
        if (measure && measure.duration > 16) { // More than 1 frame
          console.warn(`[Slow Render] ${componentName}: ${measure.duration.toFixed(2)}ms`)
        }
      } catch {
        // Measurement may fail if marks don't exist
      }
    },
  }
}

/**
 * Track a custom performance metric
 */
export function trackMetric(name: string, value: number, unit = 'ms') {
  if (typeof window === 'undefined') return

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Metric] ${name}: ${value}${unit}`)
  }

  // Could send to analytics service here
  // e.g., sendToAnalytics({ name, value, unit })
}

/**
 * Measure async operation duration
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  try {
    const result = await operation()
    const duration = performance.now() - start
    trackMetric(name, duration)
    return result
  } catch (error) {
    const duration = performance.now() - start
    trackMetric(`${name}-error`, duration)
    throw error
  }
}
