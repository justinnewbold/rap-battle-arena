import { NextResponse } from 'next/server'
import { checkHealth, getErrorStats } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health = await checkHealth({
    database: async () => {
      // Check Supabase connection
      const { error } = await supabase.from('profiles').select('id').limit(1)
      return !error
    },
    memory: async () => {
      // Check memory usage is under 90%
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage()
        const heapUsed = usage.heapUsed / usage.heapTotal
        return heapUsed < 0.9
      }
      return true
    },
  })

  // Get error stats summary
  const errorStats = getErrorStats()
  const recentErrors = Array.from(errorStats.entries())
    .filter(([_, stats]) => {
      const lastSeen = new Date(stats.lastSeen)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      return lastSeen > hourAgo
    })
    .map(([key, stats]) => ({
      error: key,
      count: stats.count,
      lastSeen: stats.lastSeen,
    }))

  const response = {
    ...health,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    recentErrors: recentErrors.length > 0 ? recentErrors.slice(0, 5) : undefined,
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
}
