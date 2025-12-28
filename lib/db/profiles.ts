import { supabase, Profile } from './client'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }
  return data
}

export type LeaderboardTimeframe = 'all' | 'month' | 'week'

export interface PaginatedLeaderboard {
  data: Profile[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export async function getLeaderboard(
  limit: number = 10,
  timeframe: LeaderboardTimeframe = 'all',
  page: number = 1
): Promise<PaginatedLeaderboard> {
  const offset = (page - 1) * limit

  let countQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  let dataQuery = supabase
    .from('profiles')
    .select('*')
    .order('elo_rating', { ascending: false })
    .range(offset, offset + limit - 1)

  if (timeframe === 'month') {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    countQuery = countQuery.gte('updated_at', monthAgo.toISOString())
    dataQuery = dataQuery.gte('updated_at', monthAgo.toISOString())
  } else if (timeframe === 'week') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    countQuery = countQuery.gte('updated_at', weekAgo.toISOString())
    dataQuery = dataQuery.gte('updated_at', weekAgo.toISOString())
  }

  const [{ count }, { data, error }] = await Promise.all([
    countQuery,
    dataQuery
  ])

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return { data: [], total: 0, page, pageSize: limit, hasMore: false }
  }

  const total = count || 0
  return {
    data: data || [],
    total,
    page,
    pageSize: limit,
    hasMore: offset + limit < total
  }
}

export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query || query.length < 2) return []

  // Sanitize query to prevent injection
  const sanitizedQuery = query.replace(/[%_\\'"(),]/g, '')

  if (!sanitizedQuery) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${sanitizedQuery}%`)
    .order('elo_rating', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error searching users:', error)
    return []
  }
  return data || []
}
